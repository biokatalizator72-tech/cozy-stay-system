

# Arkalkulacio javitasa: szobaar nem fugg a felnott letszamtol

## A problema

Az alapar (pl. 40 000 Ft/ej) a **szobara** vonatkozik, es az alapletszmot (altalaban 2 fo) mar tartalmazza. A gyerekek felara ezen felul szamitodik. Tehat:

- 2 felnott + 1 gyerek (50% kedvezmeny), 2 ejszaka: 40 000 x 2 + 20 000 x 2 = 100 000 Ft
- 1 felnott + 1 gyerek (50% kedvezmeny), 2 ejszaka: 40 000 x 2 + 20 000 x 2 = 100 000 Ft (ugyanaz!)

A jelenlegi kod `nightlyRate * adults`-szal szoroz, ami hibas.

## Megoldas

Mindket fajlban a `nightlyRate * adults` sort le kell cserelni sima `nightlyRate`-re.

| Fajl | Sor | Regi | Uj |
|------|-----|------|-----|
| `src/pages/Index.tsx` | ~240 | `total += nightlyRate * guestCounts.adults` | `total += nightlyRate` |
| `src/pages/BookingPage.tsx` | ~174 | `total += nightlyRate * adults` | `total += nightlyRate` |

A gyerekkedvezmeny logika mindket helyen valtozatlan marad.

