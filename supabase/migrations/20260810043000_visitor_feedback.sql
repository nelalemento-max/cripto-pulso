create table if not exists public.visitor_feedback (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  session_id uuid not null,
  answer text not null check (char_length(answer) between 3 and 500),
  section text not null check (char_length(section) between 1 and 60),
  device text not null check (device in ('mobile','tablet','desktop')),
  created_at timestamptz not null default now(),
  unique(visitor_id)
);

alter table public.visitor_feedback enable row level security;

create index if not exists visitor_feedback_created_at_idx
  on public.visitor_feedback(created_at desc);
