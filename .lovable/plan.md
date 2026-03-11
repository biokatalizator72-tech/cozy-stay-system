

## Naptárak induló hónapjának beállítása a szezon első napjára

### Probléma
A naptárak mindig a mai naptól indulnak, még akkor is, ha a szezon későbbi dátummal kezdődik. A felhasználó elvárja, hogy a naptár automatikusan a legközelebbi aktív szezon kezdőnapjára ugorjon.

### Megoldás

**1. Vendégoldali kereső (`SearchForm.tsx`)**
- A `Calendar` komponenseknek beállítani a `defaultMonth` / `month` propot a legközelebbi szezon kezdőnapjára (ami >= today)
- Ha nincs szezon, marad a mai nap

**2. Admin ártábla (`AdminPricing.tsx`)**
- A `dateRange` kezdőértékét (`from`/`to`) a szezonok betöltése után frissíteni: a legközelebbi aktív szezon első napjára állítani
- Így az ártábla is a szezon kezdőnapjától mutatja a napokat

### Logika (mindkét helyen)
```typescript
// Megkeresi a legközelebbi szezon kezdőnapját ami >= today
const getSeasonStartMonth = (seasons, today) => {
  if (seasons.length === 0) return today;
  // Jövőbeli vagy mai szezonok közül a legkorábbi
  const future = seasons.filter(s => new Date(s.end_date) >= today);
  if (future.length === 0) return today;
  const earliest = future.sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const startDate = new Date(earliest.start_date + 'T00:00:00');
  return startDate > today ? startDate : today;
};
```

### Módosítandó fájlok

| Fájl | Módosítás |
|---|---|
| `src/components/guest/SearchForm.tsx` | Check-in naptár `defaultMonth`-ja a szezon kezdőnapjára; check-out szinkronban |
| `src/pages/admin/AdminPricing.tsx` | `dateRange` initial state-jét a szezonok betöltése után frissíteni a szezon elejére |

