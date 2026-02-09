

# Ejszaka kedvezmenyek alkalmazasa + athuzott ar megjelenites

## Problema

A `night_discounts` tablaban levo kedvezmenyek (3+ ej = 5%, 6+ ej = 10%) nincsenek alkalmazva sem a keresesi talalati oldalon (Index.tsx), sem a foglalasi oldalon (BookingPage.tsx).

## Megoldas

### 1. `src/pages/Index.tsx` -- kedvezmeny lekerdezes es alkalmazas

**fetchData():**
- Lekerjuk a `night_discounts` tablat es eltaroljuk state-ben (`nightDiscounts`)

**handleSearch() arszamitas:**
- A `calculatedPrices` kiszamitasa utan megkeressuk a megfelelo kedvezmenyt:
  - `nightDiscounts.filter(d => nights >= d.min_nights)` kozul a legnagyobb `min_nights` erteku
  - Alkalmazzuk: `discountedPrice = total * (1 - discount_percent / 100)`
- Ket ar-tombot tarolunk state-ben:
  - `originalPrices` -- kedvezmeny nelkuli osszeg
  - `totalPrices` -- kedvezmenyezett vegosszeg
- Atkuldjuk a `discountPercent`-et is a `RoomCard`-nak

### 2. `src/components/guest/RoomCard.tsx` -- athuzott ar megjelenites

Uj props: `originalPrice?: number`, `discountPercent?: number`

Az ar megjelenitese a szallas.hu referencia alapjan:
- Ha van kedvezmeny:
  - Kis `-X%` badge (zold vagy narancs szinu)
  - Eredeti ar athuzva (szurke, kisebb betumeret, `line-through`)
  - Kedvezmenyezett ar nagyban, felkoverrel (primary szin)
- Ha nincs kedvezmeny: jelenlegi megjelenites marad

```text
Pelda megjelenites:

        -10%
    ~~246 000 Ft~~
    222 000 Ft
    6 ejszaka osszesen
```

### 3. `src/pages/BookingPage.tsx` -- foglalasi oldal

**fetchData():**
- Lekerjuk a `night_discounts` tablat

**calculateTotal():**
- Az osszeg kiszamitasa utan alkalmazzuk a kedvezmenyt
- Ket erteket adunk vissza: `{ nights, total, originalTotal, discountPercent }`

**Megjelenites (ar osszesito resz, ~410-430 sor):**
- Ha van kedvezmeny, az eredeti ar athuzva, mellette/alatta a kedvezmenyezett ar es a szazalek

## Erintett fajlok

| Fajl | Valtozas |
|------|----------|
| `src/pages/Index.tsx` | `night_discounts` fetch + alkalmazas + `originalPrices` state |
| `src/components/guest/RoomCard.tsx` | Uj props (`originalPrice`, `discountPercent`) + athuzott ar UI |
| `src/pages/BookingPage.tsx` | `night_discounts` fetch + alkalmazas + athuzott ar megjelenites |

