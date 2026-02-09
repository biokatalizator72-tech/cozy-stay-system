
# Kalkulalt teljes osszeg megjelenirese a szobatipus kartyakon

## Osszefoglalo

A szobatipus kartyakon az alapar helyett a teljes tartózkodás kalkulált összege jelenik meg, figyelembe véve a szezonális árakat (pricing_rules) és az éjszakák számát.

## Jelenlegi mukodes

- A RoomCard a `room.base_price`-t jeleníti meg "/ éjszaka" felirattal
- Az árkalkuláció csak a BookingPage-en történik meg

## Tervezett valtozasok

### 1. Index.tsx - Árkalkuláció a keresés során

A `handleSearch` függvényben a szűrés után minden elérhető szobatípushoz lekérdezzük a `pricing_rules` táblát, és kiszámoljuk a teljes összeget:

- Lekérdezés: `pricing_rules` ahol `room_type_id` az elérhető szobatípusok ID-jai között van
- Minden éjszakára: ha van `pricing_rule` az adott dátumra, annak az ára; egyébként a `base_price`
- Az eredményt egy `Map<roomTypeId, totalPrice>` struktúrában tároljuk
- Ezt átadjuk a RoomCard-nak egy új `totalPrice` prop-ként

### 2. RoomCard.tsx - Megjelenítés módosítása

- Új opcionális prop: `totalPrice?: number` és `nights?: number`
- Ha `totalPrice` megvan: a kalkulált teljes összeget jelenítjük meg "összesen" felirattal
- Ha nincs (pl. keresés előtti állapot): marad a `base_price` "/ éjszaka" felirattal

**Megjelenítés:**
```
120 000 Ft
2 éjszaka összesen
```

### 3. Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `src/pages/Index.tsx` | pricing_rules lekérdezés + totalPrice számítás + prop átadás |
| `src/components/guest/RoomCard.tsx` | totalPrice + nights prop, megjelenítés módosítás |

## Technikai reszletek

### Arkalkulacios logika (Index.tsx)

```typescript
// A handleSearch-ben, a szures utan:
const roomTypeIds = sorted.map(rt => rt.id);

const { data: pricingRules } = await supabase
  .from('pricing_rules')
  .select('room_type_id, start_date, end_date, price_per_night')
  .in('room_type_id', roomTypeIds);

// Minden szobatipusra kiszamoljuk a teljes arat
const totalPrices: Record<string, number> = {};
sorted.forEach(rt => {
  let total = 0;
  stayDates.forEach(dateStr => {
    const rule = pricingRules?.find(r => 
      r.room_type_id === rt.id && r.start_date <= dateStr && r.end_date >= dateStr
    );
    total += rule?.price_per_night || rt.base_price;
  });
  totalPrices[rt.id] = total;
});
```

### RoomCard megjelenitesi valtozas

```typescript
// Regi:
{formatPrice(room.base_price)}
/ éjszaka

// Uj (ha van totalPrice):
{formatPrice(totalPrice)}
{nights} éjszaka összesen
```
