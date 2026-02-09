
# Gyermekarak beepitese a Kedvezmenyek beallitasa oldalra

## Osszefoglalo

A meglevo AdminDiscounts.tsx oldalhoz hozzaadunk egy uj szekciot a gyermekarak kezelesere, amely lehetove teszi a gyermek korcsoportok es a hozzajuk tartozo kedvezmenyek beallitasat.

## Uj adatbazis tabla

### `child_age_brackets` - Gyermek korkategoriak

| Mezo | Tipus | Leiras |
|------|-------|--------|
| id | uuid | Elsodleges kulcs |
| from_age | integer | Kortol (0-99) |
| to_age | integer | Korig (0-99) |
| discount_percent | integer | Kedvezmeny % (0-100, ahol 100 = ingyenes) |
| sort_order | integer | Rendezesi sorrend |
| created_at | timestamp | Letrehozas ideje |

## Admin felulet modositasok

### Uj szekco az AdminDiscounts.tsx-ben

A meglevo ket szekco (Ejszaka kedvezmenyek, Kulonleges kedvezmenyek) melle erkezik egy harmadik:

```text
+--------------------------------------------------+
|  GYERMEKARAZAS                                   |
+--------------------------------------------------+
|                                                  |
|  Gyermekedvezmeny engedelyezese: [x] Be / [ ] Ki |
|                                                  |
|  +--------------------------------------------+  |
|  |  Minimum eletkor | Maximum eletkor | Kedv% |  |
|  |  [Lenyilo 0-99]  | [Lenyilo 0-99]  | [100] |  |
|  |  0               | 2               | 100%  |  |
|  |  3               | 11              | 50%   |  |
|  |                                            |  |
|  |  [+ Uj eletkor sav hozzaadasa]             |  |
|  +--------------------------------------------+  |
|                                                  |
|  [Mentes]                                        |
+--------------------------------------------------+
```

### Komponens funkcionalitas

1. **Toggle kapcsolo**: "Gyermekedvezmeny engedelyezese" - ha ki van kapcsolva, az egesz szekco szurkitve jelenik meg
2. **Korkategoria sorok**: Minden sor harom lenyilo mezovel
   - Minimum eletkor (0-99)
   - Maximum eletkor (0-99)
   - Kedvezmeny % (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 - ahol 100% = ingyenes)
3. **Uj eletkor sav hozzaadasa gomb**: Uj ures sort ad hozza
4. **Torles gomb**: Minden sor mellett
5. **Mentes gomb**: Az osszes modositast menti

### Pelda ertekek

- 0-2 eves: 100% kedvezmeny (ingyenes)
- 3-11 eves: 50% kedvezmeny (felár)
- 12-17 eves: 20% kedvezmeny

## Technikai reszletek

### Adatbazis migracio

```sql
create table public.child_age_brackets (
  id uuid primary key default gen_random_uuid(),
  from_age integer not null default 0,
  to_age integer not null default 2,
  discount_percent integer not null default 100,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.child_age_brackets enable row level security;

create policy "Anyone can view child age brackets"
  on public.child_age_brackets for select
  using (true);

create policy "Admins can manage child age brackets"
  on public.child_age_brackets for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

### Modositando fajl

| Fajl | Modositas |
|------|-----------|
| src/pages/admin/AdminDiscounts.tsx | Uj "Gyermekarazas" szekco hozzaadasa a meglevo ket szekco ele |

### Uj state valtozok az AdminDiscounts.tsx-ben

```typescript
interface ChildAgeBracket {
  id: string;
  from_age: number;
  to_age: number;
  discount_percent: number;
  sort_order: number;
}

const [childAgeBrackets, setChildAgeBrackets] = useState<ChildAgeBracket[]>([]);
const [childPricingEnabled, setChildPricingEnabled] = useState(true);
```

### UI elemek

A gyermekarazas szekcioval bovul az oldal:

1. **Card komponens** "Gyermekarazas" cimmel
2. **Switch komponens** az engedelyezeshez
3. **Table komponens** a korkategoriakhoz:
   - Oszlopok: Min. eletkor | Max. eletkor | Kedvezmeny % | Torles
   - Minden cellaban Select lenyilo
4. **Button** uj sor hozzaadasahoz
5. **Button** menteshez

### Lenyilo ertekek

- Eletkor valaszto: 0, 1, 2, 3, ..., 99
- Kedvezmeny szazalek: 0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100% (Ingyenes)

### Vizualis elhelyezes

A szekcio sorrendje az oldalon:
1. Gyermekarazas (uj)
2. Ejszakak szama szerinti kedvezmenyek (meglevo)
3. Kulonleges kedvezmenyek (meglevo)

## Arszamitasra gyakorolt hatas

A gyermekarak a felnott ar alapjan szamolodnak:

```text
Gyermek ar = Felnott ar * (1 - discount_percent / 100)

Pelda:
- Felnott ar: 20.000 Ft / fo / ej
- 5 eves gyerek, 50% kedvezmeny
- Gyermek ar: 20.000 * 0.5 = 10.000 Ft / fo / ej
```
