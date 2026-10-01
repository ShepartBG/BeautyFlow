begin;
alter table public.staff add column if not exists deleted_at timestamptz;

-- New services are assigned to every current team member. Existing exclusions remain unchanged.
create or replace function public.beautyflow_assign_new_service() returns trigger
language plpgsql security definer set search_path = public as $$
begin
 insert into public.staff_services(salon_id,staff_id,service_id)
 select new.salon_id,s.id,new.id from public.staff s
 where s.salon_id=new.salon_id and s.deleted_at is null
 on conflict(staff_id,service_id) do nothing;
 return new;
end $$;
drop trigger if exists beautyflow_new_service_assignments on public.services;
create trigger beautyflow_new_service_assignments after insert on public.services
for each row execute function public.beautyflow_assign_new_service();

-- Remove a person from the team without erasing historical appointment attribution.
create or replace function public.beautyflow_remove_staff(p_salon uuid,p_staff uuid) returns void
language plpgsql security definer set search_path = public as $$
declare member public.staff%rowtype; local_now timestamp := now() at time zone 'Europe/Sofia';
begin
 select * into member from public.staff where id=p_staff and salon_id=p_salon for update;
 if not found or member.is_owner then raise exception 'Този специалист не може да бъде изтрит.'; end if;
 if exists(select 1 from public.appointments where staff_id=p_staff and salon_id=p_salon
  and status not in ('cancelled','no_show','completed')
  and (appointment_date>local_now::date or (appointment_date=local_now::date and end_time>local_now::time)))
 then raise exception 'Специалистът има предстоящи часове. Първо ги премести или отмени.'; end if;
 update public.staff set active=false,deleted_at=now() where id=p_staff;
 update public.business_members set active=false where salon_id=p_salon and staff_id=p_staff;
end $$;
revoke all on function public.beautyflow_remove_staff(uuid,uuid) from public,anon,authenticated;
grant execute on function public.beautyflow_remove_staff(uuid,uuid) to service_role;

create table if not exists public.auth_email_rate_limits(key text primary key,attempts integer not null,expires_at timestamptz not null);
alter table public.auth_email_rate_limits enable row level security;
create or replace function public.beautyflow_allow_auth_email(p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare used integer;
begin
 delete from public.auth_email_rate_limits where expires_at < now()-interval '1 day';
 insert into public.auth_email_rate_limits(key,attempts,expires_at) values(p_key,1,now()+interval '15 minutes')
 on conflict(key) do update set attempts=case when auth_email_rate_limits.expires_at<now() then 1 else auth_email_rate_limits.attempts+1 end,
 expires_at=case when auth_email_rate_limits.expires_at<now() then now()+interval '15 minutes' else auth_email_rate_limits.expires_at end
 returning attempts into used;
 return used<=5;
end $$;
revoke all on function public.beautyflow_allow_auth_email(text) from public,anon,authenticated;
grant execute on function public.beautyflow_allow_auth_email(text) to service_role;
create or replace function public.beautyflow_assign_waitlist(p_salon uuid,p_entry uuid,p_staff uuid,p_date date,p_time time) returns uuid
language plpgsql security definer set search_path=public as $$
declare w public.waitlist_entries%rowtype; svc public.services%rowtype; hours record; duration integer; finish time; appointment uuid;
begin
 select * into w from public.waitlist_entries where id=p_entry and salon_id=p_salon for update;
 if not found or w.status<>'waiting' then raise exception 'Заявката вече не е активна.'; end if;
 if p_date<w.date_from or p_date>w.date_to or (w.time_from is not null and p_time<w.time_from) or (w.time_to is not null and p_time>w.time_to)
 then raise exception 'Часът е извън желания от клиента период.'; end if;
 if w.staff_id is not null and w.staff_id<>p_staff then raise exception 'Клиентът е избрал друг специалист.'; end if;
 if p_date+p_time < now() at time zone 'Europe/Sofia' then raise exception 'Часът вече е минал.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_staff::text||p_date::text,0));
 if not exists(select 1 from public.staff where id=p_staff and salon_id=p_salon and active and deleted_at is null)
 then raise exception 'Специалистът не е активен в този салон.'; end if;
 select * into svc from public.services where id=w.service_id and salon_id=p_salon and active;
 if not found then raise exception 'Услугата не е активна.'; end if;
 if exists(select 1 from public.staff_services where service_id=svc.id and salon_id=p_salon)
 and not exists(select 1 from public.staff_services where staff_id=p_staff and service_id=svc.id and salon_id=p_salon)
 then raise exception 'Специалистът не извършва тази услуга.'; end if;
 duration:=svc.duration_min+coalesce(svc.buffer_min,0);
 if extract(epoch from p_time)/60+duration>=1440 then raise exception 'Услугата излиза извън деня.'; end if;
 finish:=(p_time+make_interval(mins=>duration))::time;
 select enabled,start_time,end_time into hours from public.staff_working_hours where staff_id=p_staff and salon_id=p_salon and weekday=extract(dow from p_date);
 if not found then select enabled,start_time,end_time into hours from public.working_hours where salon_id=p_salon and weekday=extract(dow from p_date); end if;
 if not found or not hours.enabled or p_time<hours.start_time or finish>hours.end_time then raise exception 'Часът е извън работния график.'; end if;
 if exists(select 1 from public.time_off where salon_id=p_salon and off_date=p_date and (all_day or (start_time<finish and end_time>p_time)))
 or exists(select 1 from public.staff_time_off where salon_id=p_salon and staff_id=p_staff and off_date=p_date and (all_day or (start_time<finish and end_time>p_time)))
 then raise exception 'В избрания час има почивка или отпуск.'; end if;
 if exists(select 1 from public.appointments where salon_id=p_salon and appointment_date=p_date and status<>'cancelled'
 and (staff_id=p_staff or staff_id is null) and start_time<finish and end_time>p_time)
 then raise exception 'Часът вече е зает. Провери свободните часове отново.'; end if;
 insert into public.appointments(salon_id,service_id,staff_id,appointment_date,start_time,end_time,customer_name,customer_phone,customer_phone_normalized,customer_email,note,status)
 values(p_salon,w.service_id,p_staff,p_date,p_time,finish,w.customer_name,w.customer_phone,w.customer_phone_normalized,w.customer_email,w.note,'confirmed') returning id into appointment;
 update public.waitlist_entries set status='booked',appointment_id=appointment,updated_at=now() where id=p_entry;
 return appointment;
end $$;
revoke all on function public.beautyflow_assign_waitlist(uuid,uuid,uuid,date,time) from public,anon,authenticated;
grant execute on function public.beautyflow_assign_waitlist(uuid,uuid,uuid,date,time) to service_role;
commit;
