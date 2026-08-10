create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  country text not null check (char_length(country) between 2 and 80),
  plan text not null check (plan in ('basic_bo','crypto_10','crypto_20')),
  payment_method text not null check (payment_method in ('qr','airtm')),
  amount_label text not null,
  payment_reference text,
  receipt_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','invited')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payment_requests enable row level security;
create policy "admins_read_payment_requests" on public.payment_requests for select to authenticated using ((select private.is_admin()));
create policy "admins_update_payment_requests" on public.payment_requests for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, update on table public.payment_requests to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];
