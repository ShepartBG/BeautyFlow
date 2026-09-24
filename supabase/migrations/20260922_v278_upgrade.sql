-- BeautyFlow v2.78 upgrade. Run once in Supabase SQL Editor before testing the new features.
alter table if exists public.services add column if not exists image_url text;
alter table if exists public.access_requests add column if not exists requested_category_label text;
alter table if exists public.salon_customers add column if not exists email_normalized text;

create table if not exists public.booking_email_verifications (
  id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade,
  email text not null, code_hash text not null, expires_at timestamptz not null, verified_at timestamptz, consumed_at timestamptz,
  attempts integer not null default 0, created_at timestamptz not null default now()
);
create index if not exists booking_email_verifications_lookup on public.booking_email_verifications(salon_id,email,created_at desc);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade, staff_id uuid references public.staff(id) on delete set null,
  customer_name text not null, customer_phone text not null, customer_phone_normalized text not null, customer_email text not null,
  date_from date not null, date_to date not null, time_from time, time_to time, note text,
  status text not null default 'waiting' check (status in ('waiting','booked','cancelled')),
  appointment_id uuid references public.appointments(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists waitlist_salon_status on public.waitlist_entries(salon_id,status,date_from,date_to);

create table if not exists public.platform_categories (
  id uuid primary key default gen_random_uuid(), value text not null unique, label text not null unique, active boolean not null default true,
  sort_order integer not null default 100, created_at timestamptz not null default now()
);
insert into public.platform_categories(value,label,sort_order) values
 ('barber','Барбър',10),('hair','Фризьорски салон',20),('nails','Маникюр',30),('lashes','Миглопластика',40),('makeup','Грим',50),('massage','Масажи',60),('cosmetics','Козметика',70),('tattoo','Татуировки',80),('other','Друго',999)
on conflict(value) do update set label=excluded.label;

create table if not exists public.platform_content (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('shop','event','course')),
  title text not null, description text, image_url text, url text, location text, starts_at timestamptz,
  active boolean not null default true, sort_order integer not null default 100, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.booking_email_verifications enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.platform_categories enable row level security;
alter table public.platform_content enable row level security;
-- Public read-only discovery. Writes are performed server-side with the service role.
drop policy if exists "public categories read" on public.platform_categories;
create policy "public categories read" on public.platform_categories for select using (active=true);
drop policy if exists "public content read" on public.platform_content;
create policy "public content read" on public.platform_content for select using (active=true);

drop policy if exists "business waitlist read" on public.waitlist_entries;
create policy "business waitlist read" on public.waitlist_entries for select to authenticated using (
  exists(select 1 from public.salons s where s.id=salon_id and s.owner_id=auth.uid())
  or exists(select 1 from public.business_members bm where bm.salon_id=salon_id and bm.user_id=auth.uid() and bm.active=true)
);
