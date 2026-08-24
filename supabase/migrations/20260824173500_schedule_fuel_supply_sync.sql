create extension if not exists pg_cron;
create extension if not exists pg_net;

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
      from (values ('gasoline'), ('diesel')) as products(product_name);
    $command$, department_id);
    perform cron.schedule(
      format('fuel-supply-department-%s', department_id),
      schedule_expression,
      command_sql
    );
  end loop;
end $$;
