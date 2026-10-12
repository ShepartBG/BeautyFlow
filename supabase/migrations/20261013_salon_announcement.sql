-- BeautyFlow: temporary salon announcement (e.g. price change, holiday, closed days).
-- Additive only: three nullable columns on salons. Existing data and code are not affected.
-- Run once in Supabase → SQL Editor.

alter table public.salons add column if not exists announcement_text text;
alter table public.salons add column if not exists announcement_type text;
alter table public.salons add column if not exists announcement_until date;

alter table public.salons drop constraint if exists salons_announcement_text_length;
alter table public.salons add constraint salons_announcement_text_length
  check (announcement_text is null or char_length(announcement_text) <= 280);

alter table public.salons drop constraint if exists salons_announcement_type_valid;
alter table public.salons add constraint salons_announcement_type_valid
  check (announcement_type is null or announcement_type in ('info', 'prices', 'closed', 'promo'));
