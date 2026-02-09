
# Szoba létszám és pótágyak beállítása - min_nights teljes eltávolítása

## Összefoglalás

Az AdminRooms.tsx oldalon a "Min. éjszakák" (min_nights) mezőt teljesen eltávolítjuk, és helyére három új mezőt adunk az alaplétszám és pótágyak kezeléséhez. A minimum éjszakák követelménye a jövőben az ártáblában (pricing_rules) lesz megadva.

## Adatbázis módosítás

### Új oszlopok a `rooms` táblában

```sql
alter table public.rooms 
  add column base_capacity integer not null default 2,
  add column extra_beds integer not null default 0,
  add column adult_extra_beds integer not null default 0;

-- Meglévő capacity adatok migrációja base_capacity-be
update public.rooms set base_capacity = capacity where true;
```

A `min_nights` oszlop marad az adatbázisban (nem módosítjuk), de az alkalmazás szintjén már nem használjuk.

## AdminRooms.tsx módosítások

### Room interface

Az interface-ből eltávolítjuk a `min_nights` mezőt:
```typescript
interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  base_capacity: number;        // Új
  extra_beds: number;           // Új
  adult_extra_beds: number;     // Új
  base_price: number;
  amenities: string[];
  is_active: boolean;
  sort_order: number;
}
```

### formData

Eltávolítjuk a `min_nights`-t:
```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  base_capacity: 2,        // Új
  extra_beds: 0,           // Új
  adult_extra_beds: 0,     // Új
  base_price: 0,
  amenities: '',
  is_active: true,
});
```

### Form - Dialog tartalma

**Eltávolítandó:**
- A teljes "Min. éjszakák" input mezo blokk (jelenleg 2 oszlopos gridben az "Férőhely" mellett)

**Helyére kerülnek az új mezők** 2 oszlopos gridben:
- **1. sor**: Alaplétszám (base_capacity) és Max. pótágyak száma (extra_beds)
- **2. sor**: Max. létszám (szamított, readonly) és Ebből felnőtt méretű (adult_extra_beds)

Mezők:
- Alaplétszám: Input, type="number", min=1, max=99
- Max. pótágyak száma: Input, type="number", min=0, max=99
- Max. létszám: Readonly szöveg mezo, értéke = base_capacity + extra_beds
- Ebből felnőtt méretű: Input, type="number", min=0, max=99

### handleSave

- Kiszámítjuk: `capacity = base_capacity + extra_beds`
- A roomData-ba kerül: base_capacity, extra_beds, adult_extra_beds, capacity
- **Eltávolítjuk**: min_nights mező kimentést

### openEditRoom és openCopyRoom

Frissítjük az inicializálást:
```typescript
base_capacity: room.base_capacity,
extra_beds: room.extra_beds,
adult_extra_beds: room.adult_extra_beds,
```

**Eltávolítjuk**: `min_nights: room.min_nights`

### Room card

**Eltávolítandó:**
- A "Min. éjszakák: X" sort megjelenítő rész

**Hozzáadandó:**
- Max. létszám kijelzése: "Max. létszám: X fő"

## Technikai részletek

### Módosított fájlok
- `src/pages/admin/AdminRooms.tsx`

### Vizuális változások
- Formban 2 új sor az új 3 mezővel (Alaplétszám, Max. pótágyak, Ebből felnőtt + Max. létszám számított)
- Room kártyákon a Min. éjszakák sora helyett Max. létszám jelenik meg

### Adatbázis migrációs sor

A migration az alábbi SQL-t fogja tartalmazni:
```sql
alter table public.rooms 
  add column base_capacity integer not null default 2,
  add column extra_beds integer not null default 0,
  add column adult_extra_beds integer not null default 0;

update public.rooms set base_capacity = capacity where true;
```

