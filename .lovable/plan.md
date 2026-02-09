
# Szobatípusos árazás és kontingenskezelés

## Összefoglaló

Az árazás oldalon a jelenlegi "szoba + checkbox" rendszert átalakítjuk "szobatípus + darabszám" rendszerré. A zöld pipa checkbox helyett egy szám mező jelenik meg, ami megmutatja, hogy az adott szobatípusból hány darab foglalható az adott napon.

## Működési logika

- Ha 5 egyforma szobám van egy típusból, beírom: **5**
- Ha egy foglalt (booking táblában van rá foglalás), a rendszer automatikusan **4**-et mutat
- Ha **0**-t írok be, az azt jelenti: azon a napon nincs ilyen típusú szoba foglalható

## Adatbázis változások

### 1. Új tábla: `room_type_availability`

Ez tárolja a szobatípusonkénti napi kontingenseket:

| Mező | Típus | Leírás |
|------|-------|--------|
| id | uuid | Elsődleges kulcs |
| room_type_id | uuid | Hivatkozás a szobatípusra (FK) |
| date | date | Nap |
| available_count | integer | Elérhető szobák száma (admin által beállított) |
| created_at | timestamp | Létrehozás ideje |

### 2. Módosított tábla: `pricing_rules`

A `room_id` helyett `room_type_id`-t fog használni:

```sql
alter table public.pricing_rules 
  add column room_type_id uuid references public.room_types(id);
```

## Frontend változások az AdminPricing.tsx-ben

### Jelenlegi felépítés → Új felépítés

**Jelenlegi:**
- Sorok: egyedi szobák
- Oszlopok: napok
- Cellák: ár input + min. éjszakák input + foglalható checkbox

**Új:**
- Sorok: szobatípusok
- Oszlopok: napok
- Cellák: ár input + min. éjszakák input + **elérhető darabszám input**

### Részletes változások

1. **Interface frissítés**:
   - `Room` → `RoomType` (id, name, base_price, is_active)
   - A `rooms` lekérdezés helyett `room_types` lekérdezés

2. **Blocked dates → Availability count**:
   - A `blockedDates` state helyett `availability` state
   - A checkbox helyett number input (0-99)
   - 0 = nem foglalható, 1+ = ennyi szoba elérhető

3. **Cellastruktúra**:
   ```
   +---------+
   | [12000] |  ← Ár input
   | [  2  ] |  ← Min. éjszakák input
   | [  5  ] |  ← Elérhető szobák száma input (ÚJ)
   +---------+
   ```

4. **Mentés logika**:
   - `ical_blocked_dates` helyett `room_type_availability` táblába ment
   - 0 = az adott nap nem foglalható
   - 1+ = ennyi szoba elérhető

### Vizuális jelzés

- Ha az elérhető szám 0: piros háttér (nincs szoba)
- Ha van szabad szoba: zöld háttér intenzitása a számtól függ (opcionális)
- A szerkesztett cellák sárga háttérrel jelennek meg (mint eddig)

## Jelmagyarázat frissítése

Régi:
- Checkbox: ha be van pipálva, a nap foglalható

Új:
- Elérhető: az adott szobatípusból hány szoba foglalható (0 = nincs elérhető)

## Teljes terv (Szobatípusokkal együtt)

Ez a változtatás a korábban jóváhagyott szobatípus-rendszer része. A teljes implementáció:

1. **Adatbázis migráció**: 
   - `room_types` tábla létrehozása
   - `room_type_availability` tábla létrehozása
   - `pricing_rules` frissítése `room_type_id` mezővel
   - Adatok migrációja

2. **Új fájlok**:
   - `src/pages/admin/AdminRoomTypes.tsx` - Szobatípusok kezelése
   - `src/pages/admin/RoomTypesRoute.tsx` - Route wrapper

3. **Módosított fájlok**:
   - `src/components/admin/AdminLayout.tsx` - Szobatípusok menüpont
   - `src/pages/admin/AdminRooms.tsx` - Egyedi szobák (típushoz rendelve)
   - `src/pages/admin/AdminPricing.tsx` - Típusok + darabszám
   - `src/App.tsx` - Új route

## Összefoglalva

A checkbox-ot lecseréljük egy szám mezőre, ahol az admin beállítja, hogy az adott szobatípusból hány darab érhető el az adott napon. Ez lehetővé teszi a kontingenskezelést: több egyforma szoba esetén is pontosan tudjuk, hány szabad.
