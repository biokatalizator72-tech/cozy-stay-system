

# Naptár szinkronizálás: távozás mező az érkezés hónapjától induljon

## Probléma

Ha a vendég az érkezés mezőben pl. augusztust választ, a távozás naptár újra januártól/februártól indul, és végig kell lapozni.

## Megoldás

A `SearchForm.tsx` komponensben a távozás (check-out) `Calendar`-nak átadom a `month` és `onMonthChange` prop-okat, hogy a kiválasztott check-in dátum hónapjától induljon.

### `src/components/guest/SearchForm.tsx`

1. Új state: `checkOutMonth` (Date | undefined)
2. Amikor a check-in dátumot kiválasztják, beállítom a `checkOutMonth`-ot is arra a hónapra
3. A check-out `Calendar` komponensnek átadom: `month={checkOutMonth}` és `onMonthChange={setCheckOutMonth}`

```tsx
const [checkOutMonth, setCheckOutMonth] = useState<Date | undefined>();

// Check-in onSelect-ben:
onSelect={(date) => {
  setCheckIn(date);
  setCheckInOpen(false);
  if (date) {
    setCheckOutMonth(date);  // <-- új sor
  }
  if (date && checkOut && checkOut <= date) setCheckOut(undefined);
}}

// Check-out Calendar-ban:
<Calendar
  mode="single"
  selected={checkOut}
  month={checkOutMonth}
  onMonthChange={setCheckOutMonth}
  ...
/>
```

## Érintett fájl

| Fájl | Változás |
|------|----------|
| `src/components/guest/SearchForm.tsx` | `checkOutMonth` state + naptár hónap szinkronizálás |

