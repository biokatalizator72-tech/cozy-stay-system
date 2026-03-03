

## Minimum éjszakák ellenőrzése a vendégoldalon

### Probléma
A `pricing_rules` táblában be van állítva a `min_nights` érték (pl. júliusban min. 4 éj), de a vendégoldali keresés ezt egyáltalán nem ellenőrzi. A felhasználó 1 éjszakára is tud foglalni, holott a minimum 4 lenne.

### Megoldás
A keresési logikában (`Index.tsx`) a pricing rules lekérdezésekor a `min_nights` mezőt is le kell kérni, majd szobatípusonként ellenőrizni kell, hogy a tartózkodás hossza eléri-e a minimum éjszakák számát. Ha nem éri el, a szobatípust nem szűrjük ki teljesen, hanem a kártyán megjelenítjük a figyelmeztetést és letiltjuk a foglalás gombot.

### Lépések

**1. `src/pages/Index.tsx` -- min_nights lekérdezés és ellenőrzés**
- A pricing rules lekérdezésébe felvenni a `min_nights` mezőt
- Szobatípusonként meghatározni a maximális `min_nights` értéket a tartózkodási napokra vonatkozóan
- Új state: `minNightsMap: Record<string, number>` -- szobatípusonként a szükséges minimum éjszakák száma
- Ha a tartózkodás rövidebb, mint a minimum, a szobatípust megjelenítjük, de jelezzük a korlátozást

**2. `src/components/guest/RoomCard.tsx` -- figyelmeztetés megjelenítése**
- Új prop: `minNightsRequired?: number` -- ha a tartózkodás nem éri el ezt az értéket
- Ha `minNightsRequired` meg van adva és nagyobb mint a tartózkodás hossza:
  - Sárga figyelmeztetés szöveg: "A minimum foglalás X éj ebben az időszakban!"
  - A "Foglalás" gomb letiltása (disabled)
  - Az ár továbbra is megjelenik tájékoztatásul

### Technikai részletek

**Index.tsx -- pricing rules lekérdezés bővítése (239-242. sor):**
```typescript
const { data: pricingRules } = await supabase
  .from('pricing_rules')
  .select('room_type_id, start_date, end_date, price_per_night, min_nights')
  .in('room_type_id', roomTypeIds);
```

**Index.tsx -- min_nights számítás (a price számítás után):**
```typescript
const minNightsPerRoom: Record<string, number> = {};
sorted.forEach(rt => {
  let maxMinNights = 1;
  stayDates.forEach(dateStr => {
    const rule = pricingRules?.find(r =>
      r.room_type_id === rt.id && r.start_date <= dateStr && r.end_date >= dateStr
    );
    if (rule?.min_nights && rule.min_nights > maxMinNights) {
      maxMinNights = rule.min_nights;
    }
  });
  minNightsPerRoom[rt.id] = maxMinNights;
});
setMinNightsMap(minNightsPerRoom);
```

**RoomCard.tsx -- figyelmeztetés és gomb letiltás:**
```tsx
// Új prop
minNightsRequired?: number;

// A kártyán, ha minNightsRequired > nights:
{minNightsRequired && nights && minNightsRequired > nights && (
  <div className="text-amber-600 bg-amber-50 rounded-lg p-3 text-sm font-medium mb-3">
    A minimum foglalás {minNightsRequired} éj ebben az időszakban!
  </div>
)}

// A Foglalás gomb:
<Button disabled={!!(minNightsRequired && nights && minNightsRequired > nights)}>
  Foglalás
</Button>
```

### Módosítandó fájlok

| Fájl | Módosítás |
|---|---|
| `src/pages/Index.tsx` | `min_nights` lekérdezés, `minNightsMap` state, átadás RoomCard-nak |
| `src/components/guest/RoomCard.tsx` | `minNightsRequired` prop, figyelmeztetés megjelenítése, gomb letiltása |

