## Első oszlop rögzítése az Ártáblában

### Gyökérok
A táblázat már most is használ `sticky left-0` osztályt az első oszlopon (th és td), de a Radix `ScrollArea` komponens belső viewport-ja `display: table` stílust állít, ami **megtöri a `position: sticky` működését**. Ezért görgetéskor a szobatípus oszlop elcsúszik.

### Megoldás (`src/pages/admin/AdminPricing.tsx`)

1. **Radix `ScrollArea` lecserélése natív görgetésre** a táblázat körül:
   - `<ScrollArea className="w-full">` → `<div className="w-full overflow-x-auto">`
   - `<ScrollBar orientation="horizontal" />` sor törlése
   - Import takarítása (ScrollArea, ScrollBar)

2. **Sticky oszlop vizuális megerősítése**, hogy görgetéskor jól elkülönüljön a többi cellától:
   - A `th` és `td` `sticky left-0` cellákra: `bg-card` (már megvan, opaque), plusz jobb oldali elválasztó árnyék: `shadow-[2px_0_4px_-2px_hsl(var(--border))]` vagy `border-r border-border`
   - `z-20` a fejléc-cellára (sarok), `z-10` a sor első cellájára (már megvan)
   - `min-w-[160px]` megmarad, hogy a szobatípus név olvasható legyen

### Érintett fájl
| Fájl | Módosítás |
|---|---|
| `src/pages/admin/AdminPricing.tsx` | ScrollArea → natív `overflow-x-auto`; sticky cellák árnyékolása/z-index |

### Megjegyzés
Csak prezentációs változás, az árazási logika és adatkezelés érintetlen marad.