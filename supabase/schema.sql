-- Apply in Supabase Dashboard > SQL Editor as the database owner.
-- This file is also a migration: it upgrades the original demo bookings table safely
-- and can be run again after later room seed updates.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id text primary key,
  name text not null,
  building text not null check (building in ('KA', 'KB', 'KC', 'VA')),
  floor integer not null check (floor > 0),
  capacity integer not null check (capacity > 0),
  equipment text[] not null default '{}',
  image_url text not null default '',
  description text not null default '',
  is_available_now boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.rooms.is_available_now is
  'Legacy static sample value; live availability is derived from public.room_occupancy for the current campus slot.';

alter table public.rooms enable row level security;
grant select on public.rooms to anon, authenticated;
drop policy if exists "Rooms are readable by everyone" on public.rooms;
create policy "Rooms are readable by everyone"
  on public.rooms for select to anon, authenticated using (true);

-- The first schema used a client supplied student_id and an unconditional unique
-- key. Migrate existing installs to Auth ownership and a partial active-slot key.
create table if not exists public.bookings (
  id text primary key default gen_random_uuid()::text,
  room_id text not null references public.rooms(id),
  booking_date date not null,
  slot_id text not null,
  student_id text not null default '',
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  purpose text not null default '',
  status text not null default 'confirmed'
    check (status in ('confirmed', 'checked-in', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.bookings alter column user_id set default auth.uid();
alter table public.bookings alter column id set default gen_random_uuid()::text;
alter table public.bookings alter column purpose set default '';
alter table public.bookings alter column student_id set default '';

-- Old demo rows have no authenticated owner. Keep them for audit, but release their slots.
update public.bookings
set status = 'cancelled'
where user_id is null and status in ('confirmed', 'checked-in');

-- Drop every unconditional UNIQUE(room_id, booking_date, slot_id), including the
-- original PostgreSQL generated name bookings_room_id_booking_date_slot_id_key.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(room_id, booking_date, slot_id)%'
  loop
    execute format('alter table public.bookings drop constraint %I', constraint_name);
  end loop;
end $$;

-- Also remove a standalone unconditional unique index from deployments that
-- created one without attaching it to a table constraint.
do $$
declare
  index_oid oid;
begin
  for index_oid in
    select indexrelid
    from pg_index
    where indrelid = 'public.bookings'::regclass
      and indisunique
      and not indisprimary
      and pg_get_indexdef(indexrelid) ilike '%(room_id, booking_date, slot_id)%'
      and pg_get_indexdef(indexrelid) not ilike '% where %'
  loop
    execute format('drop index %s', index_oid::regclass);
  end loop;
end $$;

create unique index if not exists bookings_one_active_reservation_per_slot
  on public.bookings (room_id, booking_date, slot_id)
  where status in ('confirmed', 'checked-in');

create table if not exists public.room_occupancy (
  room_id text not null references public.rooms(id) on delete cascade,
  booking_date date not null,
  slot_id text not null,
  primary key (room_id, booking_date, slot_id)
);

alter table public.room_occupancy enable row level security;
revoke all on public.room_occupancy from anon, authenticated;
grant select on public.room_occupancy to anon, authenticated;
drop policy if exists "Room occupancy is public" on public.room_occupancy;
create policy "Room occupancy is public"
  on public.room_occupancy for select to anon, authenticated using (true);

-- Reject forged owners, invalid dates/slots, and client-written booking states.
create or replace function public.validate_booking_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or new.user_id is distinct from auth.uid() then
      raise exception 'A signed-in account is required.' using errcode = '42501';
    end if;
    if caller_email !~ '^[^@[:space:]]+@vku[.]udn[.]vn$' then
      raise exception 'Only @vku.udn.vn accounts may book rooms.' using errcode = '42501';
    end if;
    if new.status <> 'confirmed' then
      raise exception 'New bookings must start as confirmed.' using errcode = '42501';
    end if;
    if new.booking_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date
      or new.booking_date > (now() at time zone 'Asia/Ho_Chi_Minh')::date + 6 then
      raise exception 'Bookings must be within the next seven days.' using errcode = '22023';
    end if;
    if new.slot_id not in ('slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5') then
      raise exception 'Unknown booking time slot.' using errcode = '22023';
    end if;
    if length(new.purpose) > 300 then
      raise exception 'Purpose must be 300 characters or fewer.' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.room_id is distinct from old.room_id
    or new.booking_date is distinct from old.booking_date
    or new.slot_id is distinct from old.slot_id
    or new.purpose is distinct from old.purpose
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at then
    raise exception 'Booking details cannot be changed.' using errcode = '42501';
  end if;
  if old.status <> 'confirmed' or new.status not in ('cancelled', 'checked-in') then
    raise exception 'Only a confirmed booking can be cancelled or checked in.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_validate_write on public.bookings;
create trigger bookings_validate_write
  before insert or update on public.bookings
  for each row execute function public.validate_booking_write();

create or replace function public.sync_room_occupancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (
      select 1 from public.bookings
      where room_id = old.room_id
        and booking_date = old.booking_date
        and slot_id = old.slot_id
        and status in ('confirmed', 'checked-in')
    ) then
      delete from public.room_occupancy
      where room_id = old.room_id and booking_date = old.booking_date and slot_id = old.slot_id;
    end if;
    return old;
  end if;

  if new.status in ('confirmed', 'checked-in') then
    insert into public.room_occupancy (room_id, booking_date, slot_id)
    values (new.room_id, new.booking_date, new.slot_id)
    on conflict (room_id, booking_date, slot_id) do nothing;
  else
    if not exists (
      select 1 from public.bookings
      where room_id = new.room_id
        and booking_date = new.booking_date
        and slot_id = new.slot_id
        and status in ('confirmed', 'checked-in')
    ) then
      delete from public.room_occupancy
      where room_id = new.room_id and booking_date = new.booking_date and slot_id = new.slot_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_sync_room_occupancy on public.bookings;
create trigger bookings_sync_room_occupancy
  after insert or update of status or delete on public.bookings
  for each row execute function public.sync_room_occupancy();

-- Rebuild the privacy-safe feed from bookings. No student, account or purpose data
-- is ever stored in or exposed by room_occupancy.
delete from public.room_occupancy;
insert into public.room_occupancy (room_id, booking_date, slot_id)
select room_id, booking_date, slot_id
from public.bookings
where status in ('confirmed', 'checked-in')
on conflict (room_id, booking_date, slot_id) do nothing;

alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;
grant insert (room_id, booking_date, slot_id, purpose) on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;

drop policy if exists "Users can read their own bookings" on public.bookings;
create policy "Users can read their own bookings"
  on public.bookings for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "VKU users can create their own bookings" on public.bookings;
create policy "VKU users can create their own bookings"
  on public.bookings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and lower(coalesce((select auth.jwt() ->> 'email'), '')) ~ '^[^@[:space:]]+@vku[.]udn[.]vn$'
  );

drop policy if exists "Users can update their own active bookings" on public.bookings;
create policy "Users can update their own active bookings"
  on public.bookings for update to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'confirmed'
    and lower(coalesce((select auth.jwt() ->> 'email'), '')) ~ '^[^@[:space:]]+@vku[.]udn[.]vn$'
  )
  with check (
    user_id = (select auth.uid())
    and status in ('checked-in', 'cancelled')
    and lower(coalesce((select auth.jwt() ->> 'email'), '')) ~ '^[^@[:space:]]+@vku[.]udn[.]vn$'
  );

-- Add both tables to Realtime when Supabase has created its standard publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_occupancy'
    ) then
      execute 'alter publication supabase_realtime add table public.room_occupancy';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
    ) then
      execute 'alter publication supabase_realtime add table public.bookings';
    end if;
  end if;
end $$;
