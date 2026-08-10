create table if not exists public.basket_price_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null check (product in ('Carne de res','Pollo','Huevos','Arroz','Aceite','Azúcar','Harina','Fideo','Papa','Tomate','Cebolla','Leche')),
  price numeric(12,2) not null check (price > 0 and price <= 100000),
  unit text not null check (unit in ('kg','litro','docena','arroba','quintal','unidad')),
  department text not null check (department in ('La Paz','Santa Cruz','Cochabamba','Chuquisaca','Tarija','Oruro','Potosí','Beni','Pando')),
  city text not null check (char_length(city) between 2 and 80),
  market text not null check (char_length(market) between 2 and 120),
  purchased_on date not null default current_date check (purchased_on <= current_date),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.basket_price_reports enable row level security;
revoke all on table public.basket_price_reports from anon, authenticated;
create policy "basket_reports_no_direct_anon_access"
  on public.basket_price_reports for all to anon using (false) with check (false);
create policy "basket_reports_no_direct_authenticated_access"
  on public.basket_price_reports for all to authenticated using (false) with check (false);

create index if not exists basket_price_reports_public_idx
  on public.basket_price_reports (department, product, purchased_on desc)
  where status = 'approved';
create index if not exists basket_price_reports_pending_idx
  on public.basket_price_reports (created_at desc)
  where status = 'pending';
create index if not exists basket_price_reports_user_id_idx
  on public.basket_price_reports (user_id);
create index if not exists basket_price_reports_reviewed_by_idx
  on public.basket_price_reports (reviewed_by)
  where reviewed_by is not null;
