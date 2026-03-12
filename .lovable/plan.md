

## Az ártábla oldal crash-el, mert `dateRange` kezdetben `undefined`

### Gyökérok

A `dateRange` state `undefined`-ként van inicializálva (sor 64), de a JSX renderelés közben `dateRange.from`-ot próbál elérni (sor 436, 440, 457), ami `TypeError`-t dob, mielőtt az aszinkron `useEffect` beállítaná az értéket.

Ez a `security_invoker` fix utáni módosítás mellékhatása: korábban a `dateRange`-nek volt kezdőértéke, most viszont az aszinkron szezonbetöltés miatt `undefined`-ként indul.

### Megoldás

A renderelésben ellenőrizni kell, hogy `dateRange` definiálva van-e. Ha nincs (vagy `initialDateRangeSet` még false), loading spinner-t kell mutatni.

**Módosítandó fájl:** `src/pages/admin/AdminPricing.tsx`

A return statement elé egy early return hozzáadása:

```typescript
if (!initialDateRangeSet || !dateRange) {
  return (
    <AdminLayout>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AdminLayout>
  );
}
```

Ez a renderelési logika előtt elkapja az `undefined` állapotot, és loading-ot mutat, amíg a szezonok betöltődnek és a `dateRange` beállításra kerül.

