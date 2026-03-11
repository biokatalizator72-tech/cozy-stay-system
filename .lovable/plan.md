

## Szezonális nyitvatartás kezelése

### Koncepció
Új `seasons` tábla az adatbázisban, ahol az admin megadhatja a nyitvatartási időszakokat (pl. "Nyári szezon: 2026-05-01 – 2026-09-30"). A foglalási oldal naptárja és az admin ártábla naptárja csak ezeken az időszakokon belüli dátumokat engedélyezi.

### Adatbázis

Új tábla: `seasons`
```sql
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Adminok kezelhetik
CREATE POLICY "Admins can manage seasons" ON public.seasons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bárki lekérdezheti az aktív szezonokat
CREATE POLICY "Anyone can view active seasons" ON public.seasons
  FOR SELECT TO public
  USING (is_active = true);
```

### Admin felület: Új "Szezonok" menüpont

Új oldal: `src/pages/admin/AdminSeasons.tsx` + route fájl
- Lista a meglévő szezonokról (név, kezdő dátum, záró dátum, aktív/inaktív)
- Új szezon hozzáadása: név, kezdő dátum, záró dátum
- Szerkesztés, törlés
- Egyszerű CRUD kártyás felület a többi admin oldalhoz hasonlóan

Navigáció bővítése: `AdminLayout.tsx`-ben új menüpont "Szezonok" ikonnal (pl. `CalendarDays`).

### Naptár korlátozás

**`src/components/guest/SearchForm.tsx`** -- vendégoldali kereső naptár:
- Új prop: `seasons: { start_date: string; end_date: string }[]`
- A `Calendar` komponens `disabled` propjában kiszűrni a szezonokon kívüli dátumokat
- `Index.tsx`-ben lekérdezni az aktív szezonokat és átadni

**`src/pages/admin/AdminPricing.tsx`** -- admin ártábla naptár:
- Szintén lekérdezni a szezonokat
- A dátumválasztó naptárban (date range picker) a szezonokon kívüli napokat letiltani vagy szürkíteni
- Az ártábla cellákban a szezonon kívüli napokat vizuálisan jelölni

### Módosítandó fájlok

| Fájl | Módosítás |
|---|---|
| Database migration | `seasons` tábla létrehozása RLS-sel |
| `src/pages/admin/AdminSeasons.tsx` | Új -- szezonok CRUD oldal |
| `src/pages/admin/SeasonsRoute.tsx` | Új -- route wrapper |
| `src/App.tsx` | Új route: `/admin/seasons` |
| `src/components/admin/AdminLayout.tsx` | Új menüpont: "Szezonok" |
| `src/components/guest/SearchForm.tsx` | `seasons` prop, naptár korlátozás |
| `src/pages/Index.tsx` | Szezonok lekérdezése, átadása SearchForm-nak |
| `src/pages/admin/AdminPricing.tsx` | Szezonok lekérdezése, naptár korlátozás |

