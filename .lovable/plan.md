

## Vapi gomb elrejtése az admin oldalon

### Probléma

A Vapi asszisztens gomb az admin felületen is megjelenik és kitakarja a tartalmat (pl. ártáblát), ami zavaró az adminisztrátorok számára.

### Megoldás

A `VapiButton` komponenst áthelyezzük a `BrowserRouter`-en belülre, és a `useLocation` hook segítségével ellenőrizzük az aktuális útvonalat. Ha az `/admin` útvonallal kezdődik, a gomb nem renderelődik.

### Módosítandó fájlok

| Fájl | Módosítás |
|---|---|
| `src/components/VapiButton.tsx` | `useLocation` hozzáadása, `/admin` útvonal ellenőrzése -- ha admin oldalon vagyunk, `return null` |
| `src/App.tsx` | `VapiButton` áthelyezése a `BrowserRouter`-en belülre (hogy a `useLocation` működjön) |

### Technikai részletek

**`VapiButton.tsx`** -- a komponens elejére:
```tsx
import { useLocation } from "react-router-dom";

// A komponensen belül:
const location = useLocation();
if (location.pathname.startsWith("/admin")) return null;
```

**`App.tsx`** -- a `<VapiButton />` átkerül a `<BrowserRouter>` belsejébe, a `<Routes>` mellé.

