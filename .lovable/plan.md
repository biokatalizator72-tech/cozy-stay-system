

## Árazási logika: extra felnőttek kezelése korkategória-kedvezménnyel

### Megértés

Igen, a vendégoldali beviteli mezők maradnak: **Felnőtt** szám + **Gyerek** szám (korkategóriánként). A rendszer feladata, hogy minden szobatípusnál kiszámolja a helyes árat:

- Ha a felnőttek száma ≤ `base_capacity` → nincs pótdíj
- Ha a felnőttek száma > `base_capacity` → az extra felnőtteket a **12-99 éves korkategória kedvezményével** számítja (pl. 25% kedvezmény az egy főre jutó árból)

Példa: 3 felnőtt keres szobát:
- **Kis családi szoba** (`base_capacity=3`): alapár, nincs pótdíj
- **Deluxe B** (`base_capacity=2`): alapár + 1 felnőtt pótágy 25% kedvezménnyel

### Előfeltétel (admin felületen, kódmódosítás nélkül)
A Kedvezmények menüpont alatt fel kell vinni egy **12-99 éves korkategóriát** pl. 25% kedvezménnyel. Ez már most is lehetséges az admin UI-ban.

### Módosítások

**1. Árazási logika (`Index.tsx` + `BookingPage.tsx`)**

Mindkét fájlban az ár-kalkulációba be kell illeszteni az extra felnőttek kezelését:

```typescript
// Extra felnőttek: base_capacity felett
const extraAdults = Math.max(0, adults - rt.base_capacity);
if (extraAdults > 0) {
  // Keressük a "felnőtt" korkategóriát (from_age >= 12)
  const adultBracket = childAgeBrackets
    .filter(b => b.from_age >= 12)
    .sort((a, b) => b.from_age - a.from_age)[0];
  const discountPercent = adultBracket?.discount_percent ?? 0;
  const perPersonRate = nightlyRate / rt.base_capacity;
  total += perPersonRate * (1 - discountPercent / 100) * extraAdults;
}

// Gyerek free slot számítás: base_capacity - adults (nem változik)
const freeChildSlots = Math.max(0, rt.base_capacity - adults);
```

Ha nincs 12+ korkategória, az extra felnőttek teljes árat fizetnek (0% kedvezmény).

**2. SearchForm UI címke (`SearchForm.tsx`)**

A korkategória megjelenítésénél dinamikus címke:
- `from_age >= 12` → "Felnőtt pótágy" ikon: `Users` helyett megfelelő
- `from_age < 12` → "Gyerek" (marad)

**3. BookingPage ár-részletezés**

Az összegzőben jelenjen meg az extra felnőtt pótdíj sor, ha van.

### Módosítandó fájlok

| Fájl | Módosítás |
|---|---|
| `src/pages/Index.tsx` | Extra felnőtt pótdíj a kereső ár-kalkulációba (korkategória-kedvezménnyel) |
| `src/pages/BookingPage.tsx` | Extra felnőtt pótdíj a foglalási ár-kalkulációba + összegző sor |
| `src/components/guest/SearchForm.tsx` | Dinamikus címke: "Gyerek" vs "Felnőtt pótágy" a `from_age` alapján |

