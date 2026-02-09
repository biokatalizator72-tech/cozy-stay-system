

# Kedvezmenyek beallitasa az Admin feluleten

## Osszefoglalo

Ket tipus kedvezmenyt vezetunk be:
1. **Ejszakak szamatol fuggo kedvezmenyek** - automatikusan alkalmazodik a tartozkodas hossza alapjan
2. **Kulonleges kedvezmenyek** - elofoglalasi, torzsvendeg stb., amit az admin valaszthat ki a foglalashoz

## Uj adatbazis tablak

### 1. `night_discounts` - Ejszakak szamatol fuggo kedvezmenyek

| Mezo | Tipus | Leiras |
|------|-------|--------|
| id | uuid | Elsodleges kulcs |
| min_nights | integer | Minimum ejszakak szama (pl. 3) |
| discount_percent | integer | Kedvezmeny % (pl. 5) |
| sort_order | integer | Rendezesi sorrend |
| created_at | timestamp | Letrehozas ideje |

Pelda adatok:
- 3 ejszakatol: 5%
- 6 ejszakatol: 10%
- 10 ejszakatol: 15%

### 2. `special_discounts` - Kulonleges kedvezmenyek

| Mezo | Tipus | Leiras |
|------|-------|--------|
| id | uuid | Elsodleges kulcs |
| name | text | Kedvezmeny neve (pl. "Elofoglalasi kedvezmeny") |
| discount_percent | integer | Kedvezmeny % (pl. 10) |
| is_active | boolean | Aktiv-e (megjelenitendo-e) |
| sort_order | integer | Rendezesi sorrend |
| created_at | timestamp | Letrehozas ideje |

Pelda kedvezmenyek:
- Elofoglalasi kedvezmeny: 10%
- Torzsvendeg kedvezmeny: 15%
- Csaladbarat kedvezmeny: 5%

## Admin felulet

### Uj menupont: "Kedvezmenyek" (/admin/discounts)

Az oldal ket szekciot tartalmaz:

```text
+--------------------------------------------------+
|  KEDVEZMENYEK BEALLITASA                         |
+--------------------------------------------------+
|                                                  |
|  [1] Ejszakak szama szerinti kedvezmenyek        |
|  +--------------------------------------------+  |
|  |  Min. ejszaka   |   Kedvezmeny %           |  |
|  |  [  3  ]        |   [  5  ] %              |  |
|  |  [  6  ]        |   [ 10  ] %              |  |
|  |  [  10 ]        |   [ 15  ] %              |  |
|  |                                            |  |
|  |  [+ Uj sav hozzaadasa]                     |  |
|  +--------------------------------------------+  |
|                                                  |
|  [2] Kulonleges kedvezmenyek                     |
|  +--------------------------------------------+  |
|  |  Nev                    | Kedvezmeny % |Aktiv|
|  |  Elofoglalasi kedvezmeny|   [ 10 ] %  | [x] |  |
|  |  Torzsvendeg kedvezmeny |   [ 15 ] %  | [x] |  |
|  |                                            |  |
|  |  [+ Uj kedvezmeny felvitele]               |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

### Uj kedvezmeny felvitele dialog

```text
+-----------------------------------+
|  Uj kedvezmeny felvitele          |
+-----------------------------------+
|                                   |
|  Kedvezmeny neve:                 |
|  [Lenyilo: Elofoglalasi / Torzs-  |
|   vendeg / Egyeb...]              |
|                                   |
|  vagy Egyedi nev:                 |
|  [____________________________]   |
|                                   |
|  Kedvezmeny merteke:              |
|  [Lenyilo: 5% / 10% / 15% ...]    |
|                                   |
|  [Mentes]                         |
+-----------------------------------+
```

## Arszamitas logika

A kedvezmenyeket a kovetkezo sorrendben alkalmazzuk:

1. **Alapar szamitas**: ejszakak * napi ar
2. **Ejszaka kedvezmeny alkalmazasa**: ha tobb ejszakat foglal, mint a beallitott minimum
3. **Kulonleges kedvezmeny alkalmazasa**: ha a vendeg valasztott ilyen kedvezmenyt

Pelda:
- 5 ejszaka x 20.000 Ft = 100.000 Ft alapar
- 3+ ejszakas kedvezmeny (5%): -5.000 Ft
- Elofoglalasi kedvezmeny (10%): -9.500 Ft
- **Vegosszeg: 85.500 Ft**

## Technikai reszletek

### Uj fajlok

| Fajl | Leiras |
|------|--------|
| src/pages/admin/AdminDiscounts.tsx | Kedvezmenyek kezelese oldal |
| src/pages/admin/DiscountsRoute.tsx | Auth wrapper |

### Modositando fajlok

| Fajl | Modositas |
|------|-----------|
| src/components/admin/AdminLayout.tsx | Uj "Kedvezmenyek" menupont hozzaadasa (Percent ikon) |
| src/App.tsx | Uj route: /admin/discounts |
| src/pages/BookingPage.tsx | Ejszaka kedvezmeny automatikus alkalmazasa + opcionalis kulonleges kedvezmeny valasztas |
| src/pages/Index.tsx | Kedvezmenyek megjelenitese a szobakartyan |

### Adatbazis migraciok

```sql
-- Ejszaka kedvezmenyek tabla
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

-- Kulonleges kedvezmenyek tabla
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
```

### RLS szabalyok

- `night_discounts`: Mindenki olvashat, admin CRUD
- `special_discounts`: Mindenki olvashat, admin CRUD

### Vendegoldali valtozasok

A foglalasi oldalon (BookingPage.tsx):

1. **Automatikus ejszaka kedvezmeny**: A rendszer automatikusan alkalmazza a legjobb kedvezmenyt a foglalt ejszakak szama alapjan

2. **Kulonleges kedvezmeny valasztas**: Uj lenyilo mezo, ahol a vendeg kivalaszthatja az elerheto kedvezmenyeket (pl. elofoglalasi)

3. **Ar lebontas megjelenites**:
```text
+--------------------------------+
|  5 ejszaka x 20.000 Ft         |
|  Reszosszeg:        100.000 Ft |
|  5+ ej. kedv. (-5%):  -5.000 Ft|
|  Elofoglalasi (-10%): -9.500 Ft|
|  --------------------------    |
|  Vegosszeg:          85.500 Ft |
+--------------------------------+
```

### Navigacio bovites

Az AdminLayout.tsx-ben uj menupont:
- Nev: "Kedvezmenyek"
- Utvonal: /admin/discounts
- Ikon: Percent (lucide-react)

A meglevo menupontok kozott az "Arazas" es "Foglalasok" kozott helyezkedik el.

