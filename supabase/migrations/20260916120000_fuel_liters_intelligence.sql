-- Historial de litros reales publicado por la nueva plataforma ANH.
-- Se mantiene separado de fuel_status_snapshots, que conserva el histórico legado por rangos.
create table if not exists public.fuel_capacity_profiles (
  station_id bigint not null references public.fuel_stations(station_id) on delete cascade,
  product text not null check (product in ('gasoline', 'diesel', 'premium', 'uls')),
  estimated_capacity_liters integer not null default 25000 check (estimated_capacity_liters > 0),
  max_reported_liters integer not null default 0 check (max_reported_liters >= 0),
  readings_above_threshold integer not null default 0 check (readings_above_threshold >= 0),
  capacity_source text not null default 'default' check (capacity_source in ('default', 'learned')),
  updated_at timestamptz not null default now(),
  primary key (station_id, product)
);

create table if not exists public.fuel_liter_snapshots (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.fuel_stations(station_id) on delete cascade,
  product text not null check (product in ('gasoline', 'diesel', 'premium', 'uls')),
  balance_liters integer not null check (balance_liters >= 0),
  estimated_capacity_liters integer not null check (estimated_capacity_liters > 0),
  estimated_fill_percent numeric(6,2) not null check (estimated_fill_percent between 0 and 100),
  estimated_outflow_liters integer not null default 0 check (estimated_outflow_liters >= 0),
  estimated_restock_liters integer not null default 0 check (estimated_restock_liters >= 0),
  event_type text not null default 'stable' check (event_type in ('initial','stable','estimated_sale','official_dispatch','estimated_restock','possible_correction','outlier')),
  has_sales boolean not null default false,
  last_sale_at timestamptz,
  dispatch_in_progress boolean not null default false,
  dispatch_at timestamptz,
  tracking_id bigint,
  source_updated_at timestamptz,
  observed_at timestamptz not null default now(),
  observed_bucket timestamptz not null,
  unique (station_id, product, observed_bucket)
);

alter table public.fuel_capacity_profiles enable row level security;
alter table public.fuel_liter_snapshots enable row level security;
revoke all on table public.fuel_capacity_profiles from anon, authenticated;
revoke all on table public.fuel_liter_snapshots from anon, authenticated;

create index if not exists fuel_liter_snapshots_history_idx
  on public.fuel_liter_snapshots (product, observed_bucket desc, station_id);
create index if not exists fuel_liter_snapshots_station_idx
  on public.fuel_liter_snapshots (station_id, product, observed_bucket desc);
create index if not exists fuel_liter_snapshots_events_idx
  on public.fuel_liter_snapshots (product, event_type, observed_bucket desc)
  where event_type in ('estimated_sale','official_dispatch','estimated_restock');

create or replace view public.fuel_liter_trend
with (security_invoker = true)
as
select
  fs.department_id,
  s.product,
  s.observed_bucket,
  count(*)::integer as total,
  count(*) filter (where s.balance_liters > 0)::integer as available,
  count(*) filter (where s.balance_liters = 0)::integer as empty,
  count(*) filter (where s.has_sales)::integer as selling,
  count(*) filter (where s.dispatch_in_progress)::integer as dispatches,
  sum(s.balance_liters)::bigint as total_liters,
  round(avg(s.balance_liters))::integer as average_liters,
  round(percentile_cont(0.5) within group (order by s.balance_liters))::integer as median_liters,
  round(avg(s.estimated_fill_percent), 1) as average_fill_percent,
  sum(s.estimated_outflow_liters)::bigint as estimated_outflow_liters,
  sum(s.estimated_restock_liters)::bigint as estimated_restock_liters,
  least(100, greatest(0, round(
    (count(*) filter (where s.balance_liters > 0) * 40.0 / nullif(count(*), 0)) +
    (avg(s.estimated_fill_percent) * 0.25) +
    (count(*) filter (where s.has_sales) * 20.0 / nullif(count(*), 0)) +
    (count(*) filter (where s.balance_liters >= s.estimated_capacity_liters * 0.2) * 10.0 / nullif(count(*), 0)) +
    (least(count(*) filter (where s.dispatch_in_progress), greatest(count(*) * 0.1, 1)) * 5.0 /
      nullif(greatest(count(*) * 0.1, 1), 0))
  )))::integer as index
from public.fuel_liter_snapshots s
join public.fuel_stations fs on fs.station_id = s.station_id
group by fs.department_id, s.product, s.observed_bucket;

create or replace view public.fuel_station_daily_metrics
with (security_invoker = true)
as
select
  fs.department_id,
  s.station_id,
  s.product,
  (s.observed_bucket at time zone 'America/La_Paz')::date as local_day,
  sum(s.estimated_outflow_liters)::bigint as estimated_sales_liters,
  sum(s.estimated_restock_liters)::bigint as estimated_restock_liters,
  count(*) filter (where s.event_type in ('official_dispatch','estimated_restock'))::integer as restock_events,
  count(*)::integer as readings,
  min(s.observed_bucket) as first_reading,
  max(s.observed_bucket) as last_reading
from public.fuel_liter_snapshots s
join public.fuel_stations fs on fs.station_id = s.station_id
group by fs.department_id, s.station_id, s.product, (s.observed_bucket at time zone 'America/La_Paz')::date;

revoke all on public.fuel_liter_trend from public, anon, authenticated;
revoke all on public.fuel_station_daily_metrics from public, anon, authenticated;
grant select on public.fuel_liter_trend to service_role;
grant select on public.fuel_station_daily_metrics to service_role;

-- Reprograma los nueve departamentos cada 15 minutos y conserva el escalonamiento.
do $$
declare
  department_id integer;
  minute_offset integer;
  schedule_expression text;
  command_sql text;
begin
  for department_id in 1..9 loop
    perform cron.unschedule(format('fuel-supply-department-%s', department_id));
    minute_offset := department_id - 1;
    schedule_expression := format('%s,%s,%s,%s * * * *', minute_offset, minute_offset + 15, minute_offset + 30, minute_offset + 45);
    command_sql := format($command$
      select net.http_get(
        url := 'https://cripto-pulso.vercel.app/api/fuel-supply',
        params := jsonb_build_object('department', %s, 'product', product_name),
        headers := '{"User-Agent":"CriptoPulso-Supabase-Scheduler/2.0"}'::jsonb,
        timeout_milliseconds := 30000
      )
      from (values ('gasoline'), ('diesel'), ('premium'), ('uls')) as products(product_name);
    $command$, department_id);
    perform cron.schedule(format('fuel-supply-department-%s', department_id), schedule_expression, command_sql);
  end loop;
end $$;
