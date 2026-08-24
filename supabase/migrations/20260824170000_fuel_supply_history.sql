create table if not exists public.fuel_stations (
  station_id bigint primary key,
  name text not null,
  address text not null default '',
  zone text not null default '',
  department_id smallint not null check (department_id between 1 and 9),
  latitude double precision,
  longitude double precision,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.fuel_status_snapshots (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.fuel_stations(station_id) on delete cascade,
  product text not null check (product in ('gasoline', 'diesel')),
  balance_status text not null check (balance_status in ('high', 'medium', 'low', 'unavailable')),
  has_sales boolean not null default false,
  last_sale_at timestamptz,
  dispatch_in_progress boolean not null default false,
  dispatch_at timestamptz,
  source_updated_at timestamptz,
  observed_at timestamptz not null default now(),
  observed_bucket timestamptz not null,
  unique (station_id, product, observed_bucket)
);

alter table public.fuel_stations enable row level security;
alter table public.fuel_status_snapshots enable row level security;
revoke all on table public.fuel_stations from anon, authenticated;
revoke all on table public.fuel_status_snapshots from anon, authenticated;

create policy "fuel_stations_server_only_anon" on public.fuel_stations
  for all to anon using (false) with check (false);
create policy "fuel_stations_server_only_authenticated" on public.fuel_stations
  for all to authenticated using (false) with check (false);
create policy "fuel_snapshots_server_only_anon" on public.fuel_status_snapshots
  for all to anon using (false) with check (false);
create policy "fuel_snapshots_server_only_authenticated" on public.fuel_status_snapshots
  for all to authenticated using (false) with check (false);

create index if not exists fuel_stations_department_idx
  on public.fuel_stations (department_id, name);
create index if not exists fuel_snapshots_history_idx
  on public.fuel_status_snapshots (product, observed_at desc, station_id);
create index if not exists fuel_snapshots_station_idx
  on public.fuel_status_snapshots (station_id, product, observed_at desc);
