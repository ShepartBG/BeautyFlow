-- BeautyFlow: mark appointments booked manually by the salon (owner/specialist) vs online by the client.
-- Additive only: one nullable column. Existing appointments stay NULL (treated as online).

alter table public.appointments add column if not exists source text;

alter table public.appointments drop constraint if exists appointments_source_valid;
alter table public.appointments add constraint appointments_source_valid
  check (source is null or source in ('online', 'manual'));
