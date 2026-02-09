

# Arkalkulacio javitasa: vendegszam es gyerekkedvezmeny figyelembevetele

## A problema

Az arszamitas jelenleg csak `ar_per_ejszaka * ejszakak_szama` keplettel szamol, de az arak **fonkent es ejszakankent** ertendok. Tehat:
- 2 felnott + 1 gyerek (3-12 eves, 50% kedvezmeny) eseten a helyes keplet:
  `(2 * teljes_ar + 1 * teljes_ar * 0.5) * ejszakak`

## Megoldas

### 1. Index.tsx - handleSearch arkalkulacio modositasa

A `calculatedPrices` szamitasnal figyelembe vesszuk a vendegszamot:

```
Minden szobatipusra, minden ejszakara:
  napi_ar = pricing_rule vagy base_price
  total += napi_ar * adults
  + minden gyerek korcsoport:
      total += napi_ar * (1 - discount_percent/100) * count
```

Ehhez szukseg van a `childAgeBrackets` adatokra (mar elerheto a state-ben), hogy a `bracketId` alapjan megtalaljuk a `discount_percent` erteket.

### 2. BookingPage.tsx - calculateTotal javitasa

Ugyanezt a logikakat kell alkalmazni a foglalasi oldalon is, hogy az aras konzisztens legyen. Az `adults` es `children` parametereket az URL-bol olvassuk be.

## Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `src/pages/Index.tsx` | Arkalkulacio bovitese: vendegszam * ar + gyerekkedvezmeny |
| `src/pages/BookingPage.tsx` | Ugyanaz a kalkulacios logika, URL parameterekbol olvasva |

## Pelda szamitas

Deluxe B, 1 ejszaka, ar: 40 000 Ft/fo/ej
- 2 felnott: 2 x 40 000 = 80 000 Ft
- 1 gyerek (3-12 eves, 50% kedvezmeny): 1 x 40 000 x 0.5 = 20 000 Ft
- Osszesen: 100 000 Ft

