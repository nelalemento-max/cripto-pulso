alter table public.payment_requests
  add column if not exists whatsapp text;
