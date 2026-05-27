## Tab billentyű vízszintes navigáció az ártáblában

Jelenleg a Tab a természetes DOM-sorrendet követi: Ár → Min → Db → következő nap Ára. A kérés szerint a Tab maradjon **ugyanabban a mezőben** (Ár, Min vagy Db), és ugorjon **vízszintesen a következő napra**.

### Megoldás

Az `AdminPricing.tsx` ártáblájában a három `Input` mező kap egy közös azonosítási sémát adat-attribútumokon keresztül, és egy közös `onKeyDown` kezelőt:

1. **Adat-attribútumok** minden inputon:
   - `data-row={roomType.id}`
   - `data-col={dateStr}` (yyyy-MM-dd)
   - `data-field="price" | "min" | "avail"`

2. **`handleCellKeyDown(e)` függvény** a komponensben:
   - Csak `Tab` lenyomásra fut (Enter és nyilak érintetlenek).
   - `e.preventDefault()`, majd kiszámolja az aktuális nap indexét a `days` tömbben.
   - `Shift+Tab` → előző nap, `Tab` → következő nap, ugyanazon `roomType.id` és `field` értékkel.
   - Ha a sor szélére ér (első/utolsó nap):
     - Tab az utolsó napon → következő szobatípus első napjának ugyanazon mezője
     - Shift+Tab az első napon → előző szobatípus utolsó napjának ugyanazon mezője
     - A táblázat széleinél nem csinál semmit (alapértelmezett blur).
   - A célmezőt `document.querySelector(`input[data-row="..."][data-col="..."][data-field="..."]`)` alapján fókuszálja és kijelöli (`.select()`), hogy a gépelés azonnal felülírja.

3. **Görgetés**: mivel a célinput sticky első oszlopon kívül lehet a látható területen kívül, a fókuszálás után `focus({ preventScroll: false })` természetes módon görget. A sticky bal oszlop ezt nem zavarja.

### Érintett fájl

| Fájl | Módosítás |
|---|---|
| `src/pages/admin/AdminPricing.tsx` | `handleCellKeyDown` hozzáadása, három `Input`-re `data-*` attribútumok és `onKeyDown` rákötése. |

Más viselkedés (mentés, validáció, layout) nem változik.
