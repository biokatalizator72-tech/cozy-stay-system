

# Gyerekkedvezmeny logika javitasa: csak base_capacity feletti gyerekek fizetnek felarat

## A problema

A gyerekkedvezmeny jelenleg minden gyerekre felszamitodik, de valojaban a szoba alapara mar tartalmazza a `base_capacity` (altalaban 2) fo arat. Ha kevesebb felnott van, mint a base_capacity, a gyerekek "feltoltik" a maradek helyeket teljes aron (ami mar benne van az alaparban), es csak az azon feluli gyerekek fizetnek kedvezmenyes arat.

### Peldak (Deluxe B: 40 000 Ft/ej, base_capacity=2, gyerek kedvezmeny=50%)

| Osszettel | Szamitas | Osszeg/ej |
|-----------|----------|-----------|
| 2 felnott, 0 gyerek | 40 000 | 40 000 Ft |
| 1 felnott, 1 gyerek | 40 000 (gyerek betolti a 2. helyet) | 40 000 Ft |
| 2 felnott, 1 gyerek | 40 000 + 10 000 (1 extra gyerek) | 50 000 Ft |
| 1 felnott, 2 gyerek | 40 000 + 10 000 (1 betolt, 1 extra) | 50 000 Ft |
| 1 felnott, 3 gyerek | 40 000 + 20 000 (1 betolt, 2 extra) | 60 000 Ft |

## Megoldas

Mindket fajlban a gyerekkedvezmeny szamitast ugy kell modositani, hogy eloszor kiszamoljuk a szabad helyeket (`base_capacity - adults`), majd csak az azon feluli gyerekek utan szamitunk felarat.

## Technikai reszletek

### Logika

```text
freeChildSlots = max(0, base_capacity - adults)
totalChildren = sum of all child counts

For each night:
  total += nightlyRate                          // szoba alapar
  remainingFreeSlots = freeChildSlots
  for each childBracket:
    paidCount = child.count
    if remainingFreeSlots > 0:
      absorbed = min(remainingFreeSlots, child.count)
      paidCount = child.count - absorbed
      remainingFreeSlots -= absorbed
    if paidCount > 0:
      perPersonRate = nightlyRate / base_capacity
      total += perPersonRate * (1 - discount/100) * paidCount
```

### Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `src/pages/Index.tsx` | `RoomType` interfeszhez `base_capacity` hozzaadasa; gyerekkedvezmeny logika atirasa a fenti szerint (~240-249. sorok) |
| `src/pages/BookingPage.tsx` | `RoomType` interfeszhez `base_capacity` hozzaadasa; `calculateTotal` gyerekkedvezmeny logika atirasa (~172-182. sorok) |

### Index.tsx valtozas (234-249. sorok kornyeke)

A `sorted.forEach` ciklusban, minden ejszakara:
1. `nightlyRate` hozzaadasa (valtozatlan)
2. Szabad helyek szamitasa: `Math.max(0, rt.base_capacity - guestCounts.adults)`
3. Gyerekeken vegigiteralva: elobb a szabad helyeket toltjuk fel (ingyenes), utana a maradek gyerekek fizetnek kedvezmenyes `perPersonRate`-et

### BookingPage.tsx valtozas (172-182. sorok kornyeke)

Ugyanaz a logika, `roomType.base_capacity` es `adults` valtozokkal.

