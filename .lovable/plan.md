

# Vendégoldali keresőűrlap bővítése felnőtt/gyerek kategóriákkal

## Összefoglaló

A jelenlegi egyszerű "Vendégek" számláló helyett külön bemeneti mezőket hozunk létre a felnőtteknek és a különböző korcsoportú gyerekeknek. A korcsoportok a `child_age_brackets` táblából dinamikusan töltődnek be.

## Jelenlegi állapot az adatbázisban

A `child_age_brackets` tábla tartalma:
- **0-2 éves**: 100% kedvezmény (ingyenes)
- **3-12 éves**: 50% kedvezmény

Ezek alapján a keresőűrlap a következő kategóriákat fogja megjeleníteni:
- **Felnőtt**
- **Gyerek (0-2 éves)**
- **Gyerek (3-12 éves)**

## Frontend változások

### 1. SearchForm.tsx módosítások

**Új props**:
```typescript
interface ChildAgeBracket {
  id: string;
  from_age: number;
  to_age: number;
  discount_percent: number;
  sort_order: number;
}

interface GuestCounts {
  adults: number;
  children: { bracketId: string; count: number }[];
}

interface SearchFormProps {
  maxCapacity: number;
  childAgeBrackets: ChildAgeBracket[];
  onSearch: (checkIn: Date, checkOut: Date, guestCounts: GuestCounts) => void;
  isSearching?: boolean;
}
```

**Új state**:
```typescript
const [adults, setAdults] = useState(2);
const [childCounts, setChildCounts] = useState<Record<string, number>>({});
```

**Új UI struktúra** (2 sorban):

1. sor: Érkezés | Távozás | Keresés gomb
2. sor: Felnőttek | Gyerek (0-2 éves) | Gyerek (3-12 éves)

Minden vendég kategória azonos stílusban jelenik meg:
```
┌─────────────────────────────────┐
│ Felnőttek                       │
│ ┌───┐        ┌───┐              │
│ │ - │   2 fő │ + │              │
│ └───┘        └───┘              │
└─────────────────────────────────┘
```

### 2. Index.tsx módosítások

**Új adatlekérés**:
```typescript
const [childAgeBrackets, setChildAgeBrackets] = useState<ChildAgeBracket[]>([]);

// Fetch child age brackets
const { data: bracketsData } = await supabase
  .from('child_age_brackets')
  .select('*')
  .order('sort_order');
```

**SearchParams interface bővítése**:
```typescript
interface SearchParams {
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: { bracketId: string; age: number; count: number }[];
}
```

**handleSearch módosítása**:
- Az összes vendég számát kiszámítja: `adults + sum(children.count)`
- Ellenőrzi, hogy a szoba kapacitása elegendő-e
- Az új adatstruktúrát továbbítja a RoomCard komponensnek

### 3. RoomCard.tsx módosítások

**Új props**:
```typescript
interface RoomCardProps {
  room: Room;
  images: RoomImage[];
  index: number;
  checkIn?: Date;
  checkOut?: Date;
  adults?: number;
  children?: { bracketId: string; count: number }[];
}
```

**URL paraméterek bővítése**:
```typescript
const buildBookingUrl = () => {
  // ...
  if (adults) params.set('adults', adults.toString());
  if (children) params.set('children', JSON.stringify(children));
  // ...
};
```

## Vizuális terv

A keresőűrlap új elrendezése mobilon és desktopon:

**Desktop (2 sor)**:
```
┌──────────────┬──────────────┬────────────────────────┐
│   Érkezés    │   Távozás    │  Szabad szobák keresése│
├──────────────┼──────────────┼────────────────────────┤
│  Felnőttek   │Gyerek (0-2)  │    Gyerek (3-12)       │
│   [- 2 +]    │   [- 0 +]    │      [- 0 +]           │
└──────────────┴──────────────┴────────────────────────┘
```

**Mobil (egymás alatt)**:
```
┌────────────────────────────────┐
│           Érkezés              │
├────────────────────────────────┤
│           Távozás              │
├────────────────────────────────┤
│         Felnőttek              │
│          [- 2 +]               │
├────────────────────────────────┤
│      Gyerek (0-2 éves)         │
│          [- 0 +]               │
├────────────────────────────────┤
│      Gyerek (3-12 éves)        │
│          [- 0 +]               │
├────────────────────────────────┤
│   Szabad szobák keresése       │
└────────────────────────────────┘
```

## Módosítandó fájlok

1. **src/components/guest/SearchForm.tsx** - Teljes átdolgozás az új mezőkkel
2. **src/pages/Index.tsx** - Child age brackets lekérése, SearchParams bővítése
3. **src/components/guest/RoomCard.tsx** - URL paraméterek bővítése

## Technikai megjegyzések

- A gyerek korcsoportok dinamikusan töltődnek a `child_age_brackets` táblából
- Ha új korcsoportot ad hozzá az admin, az automatikusan megjelenik a keresőben
- A felnőttek minimális száma: 1
- A gyerekek minimális száma kategóriánként: 0
- Az összes vendég nem haladhatja meg a `maxCapacity` értékét

