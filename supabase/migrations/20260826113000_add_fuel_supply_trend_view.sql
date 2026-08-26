create or replace view public.fuel_supply_trend
with (security_invoker = true)
as
select
  fs.department_id,
  s.product,
  s.observed_bucket,
  count(*)::integer as total,
  count(*) filter (where s.balance_status = 'high')::integer as high,
  count(*) filter (where s.balance_status = 'medium')::integer as medium,
  count(*) filter (where s.balance_status = 'low')::integer as low,
  count(*) filter (where s.balance_status = 'unavailable')::integer as unavailable,
  round((
    count(*) filter (where s.balance_status = 'high') * 100.0 +
    count(*) filter (where s.balance_status = 'medium') * 60.0 +
    count(*) filter (where s.balance_status = 'low') * 20.0
  ) / nullif(count(*), 0))::integer as index
from public.fuel_status_snapshots s
join public.fuel_stations fs on fs.station_id = s.station_id
where s.product in ('gasoline', 'diesel', 'premium', 'uls')
group by fs.department_id, s.product, s.observed_bucket;

revoke all on public.fuel_supply_trend from public, anon, authenticated;
grant select on public.fuel_supply_trend to service_role;
