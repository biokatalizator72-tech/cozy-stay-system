-- Gyermek korkategóriák tábla
create table public.child_age_brackets (
  id uuid primary key default gen_random_uuid(),
  from_age integer not null default 0,
  to_age integer not null default 2,
  discount_percent integer not null default 100,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.child_age_brackets enable row level security;

-- Mindenki olvashatja
create policy "Anyone can view child age brackets"
  on public.child_age_brackets for select
  using (true);

-- Admin kezelheti
create policy "Admins can manage child age brackets"
  on public.child_age_brackets for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));