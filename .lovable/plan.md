

# A {deposit} hiba javitasa - hianyzo nullak

## A problema oka

A `total_price` ertek a foglalasi oldalrol mar **formatazva** erkezik az edge function-be: `72 000` (szokozzel elvalasztva, magyar szamformat). A `parseFloat("72 000")` viszont csak a szokoz elotti reszt olvassa be, tehat `72`-t kap. Igy `72 * 50 / 100 = 36` lesz az eloleg.

## Megoldas

Ket helyen kell javitani:

### 1. `src/pages/BookingPage.tsx` (272. sor)

A `total_price`-t nyers szamkent kuldjuk, ne formatazva:

**Jelenleg:**
```typescript
total_price: total.toLocaleString('hu-HU'),
```

**Javitva:**
```typescript
total_price: total,
```

### 2. `supabase/functions/send-booking-confirmation/index.ts` (52. sor)

A `{total_price}` placeholder-t formatazva jelenitjuk meg az emailben (hogy szepen nezzen ki ezres elvalasztoval):

**Jelenleg:**
```typescript
.replace(/{total_price}/g, total_price || "")
```

**Javitva:**
```typescript
.replace(/{total_price}/g, totalPriceNum.toLocaleString("hu-HU"))
```

Igy a szamitas helyes lesz (`72000 * 50 / 100 = 36000`), es az emailben is szepen formatazva jelenik meg mind a vegosszeg (`72 000`), mind az eloleg (`36 000`).

## Erintett fajlok

| Fajl | Valtozas |
|------|----------|
| `src/pages/BookingPage.tsx` | `total_price`-t nyers szamkent kuldi |
| `supabase/functions/send-booking-confirmation/index.ts` | `{total_price}` megjelenitest formatazza |

