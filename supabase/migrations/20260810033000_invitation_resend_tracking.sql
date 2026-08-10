alter table public.payment_requests
  add column if not exists invite_sent_at timestamptz,
  add column if not exists resend_requested_at timestamptz;

update public.payment_requests
set invite_sent_at = coalesce(invite_sent_at, reviewed_at)
where status = 'invited';
