create schema if not exists private;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = (select auth.uid()) and role = 'admin' and status = 'active'); $$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create policy "profiles_read_own_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy "profiles_admin_update" on public.profiles for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, update on table public.profiles to authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin insert into public.profiles (user_id,email,role,status) values (new.id,coalesce(new.email,''),'user','pending') on conflict (user_id) do nothing; return new; end; $$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
