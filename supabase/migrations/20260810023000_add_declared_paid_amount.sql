alter table public.payment_requests add column paid_amount text;
update public.payment_requests set paid_amount = amount_label where paid_amount is null;
alter table public.payment_requests alter column paid_amount set not null;
