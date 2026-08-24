alter table public.fuel_status_snapshots
  drop constraint if exists fuel_status_snapshots_product_check;
alter table public.fuel_status_snapshots
  add constraint fuel_status_snapshots_product_check
  check (product in ('gasoline', 'diesel', 'premium', 'uls', 'legacy_diesel', 'legacy_premium'));

-- Las consultas anteriores usaban los códigos ANH desplazados:
-- "gasoline" consultaba Diésel (1) y "diesel" consultaba Premium (2).
-- Se conserva como historial legado separado para evitar mezclarlo con las nuevas series correctas.
update public.fuel_status_snapshots
set product = case product
  when 'gasoline' then 'legacy_diesel'
  when 'diesel' then 'legacy_premium'
  else product
end
where product in ('gasoline', 'diesel');

do $$
declare
  department_id integer;
  minute_offset integer;
  schedule_expression text;
  command_sql text;
begin
  for department_id in 1..9 loop
    minute_offset := (department_id - 1) * 3;
    schedule_expression := format('%s,%s * * * *', minute_offset, minute_offset + 30);
    command_sql := format($command$
      select net.http_get(
        url := 'https://cripto-pulso.vercel.app/api/fuel-supply',
        params := jsonb_build_object('department', %s, 'product', product_name),
        headers := '{"User-Agent":"CriptoPulso-Supabase-Scheduler/1.0"}'::jsonb,
        timeout_milliseconds := 30000
      )
      from (values ('gasoline'), ('diesel'), ('premium'), ('uls')) as products(product_name);
    $command$, department_id);
    perform cron.schedule(
      format('fuel-supply-department-%s', department_id),
      schedule_expression,
      command_sql
    );
  end loop;
end $$;
