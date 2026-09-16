create policy "fuel_capacity_server_only_anon" on public.fuel_capacity_profiles
  for all to anon using (false) with check (false);
create policy "fuel_capacity_server_only_authenticated" on public.fuel_capacity_profiles
  for all to authenticated using (false) with check (false);
create policy "fuel_liters_server_only_anon" on public.fuel_liter_snapshots
  for all to anon using (false) with check (false);
create policy "fuel_liters_server_only_authenticated" on public.fuel_liter_snapshots
  for all to authenticated using (false) with check (false);
