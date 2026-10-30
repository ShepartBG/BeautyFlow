-- BeautyFlow: log of automatic "payment due" reminders, so each reminder is sent only once
-- per salon, per subscription end date and per stage (7 days, 3 days, 1 day, expiry day).
-- Additive only. Written and read by the server (service role); no public access.

create table if not exists public.subscription_reminders (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  period_end date not null,
  stage text not null check (stage in ('day7', 'day3', 'day1', 'day0')),
  sent_to text,
  created_at timestamptz not null default now(),
  unique (salon_id, period_end, stage)
);

alter table public.subscription_reminders enable row level security;
revoke all on public.subscription_reminders from anon, authenticated;
