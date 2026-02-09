-- Új oszlopok hozzáadása a rooms táblához
alter table public.rooms 
  add column base_capacity integer not null default 2,
  add column extra_beds integer not null default 0,
  add column adult_extra_beds integer not null default 0;

-- Meglévő capacity adatok migrációja base_capacity-be
update public.rooms set base_capacity = capacity where true;