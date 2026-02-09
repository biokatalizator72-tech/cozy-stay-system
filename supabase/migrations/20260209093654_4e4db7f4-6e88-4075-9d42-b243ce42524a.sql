-- Éjszakák számától függő kedvezmények tábla
create table public.night_discounts (
  id uuid primary key default gen_random_uuid(),
  min_nights integer not null,
  discount_percent integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.night_discounts enable row level security;

-- Mindenki olvashatja
create policy "Anyone can view night discounts"
  on public.night_discounts for select
  using (true);

-- Admin kezelheti
create policy "Admins can manage night discounts"
  on public.night_discounts for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Különleges kedvezmények tábla
create table public.special_discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_percent integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.special_discounts enable row level security;

-- Mindenki olvashatja
create policy "Anyone can view special discounts"
  on public.special_discounts for select
  using (true);

-- Admin kezelheti
create policy "Admins can manage special discounts"
  on public.special_discounts for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));