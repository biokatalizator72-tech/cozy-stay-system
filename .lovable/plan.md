

# Fix: Tomeges kitoltes nem menti az adatokat

## Problema

A `pricing_rules` tabla `room_id` oszlopara foreign key constraint van, ami a `rooms` tablara hivatkozik. A jelenlegi kod a **room_type_id**-t irja be a `room_id` mezobe is, ami ervenytelen foreign key -- ezert minden INSERT hibara fut.

Ez a hiba a `saveBulk()` fuggvenyben es a `savePricing()` fuggvenyben is jelen van.

## Megoldas

### Modositando fajl: `src/pages/admin/AdminPricing.tsx`

1. **Rooms lekerese**: A `fetchData()` fuggvenyben lekerjuk a `rooms` tablat is (legalabb `id` es `room_type_id` mezok), es eltaroljuk state-ben.

2. **`saveBulk()` javitasa**: Az INSERT muveletnel a `room_id` mezobe az adott `room_type_id`-hoz tartozo elso szoba (`rooms` tabla) ID-jat hasznaljuk, nem a room_type_id-t.

3. **`savePricing()` javitasa**: Ugyanez a logika -- a room_type_id helyett a megfelelo room id-t hasznaljuk.

### Konkret valtozasok

- Uj state: `rooms` tomb (id, room_type_id)
- `fetchData`-ban uj lekerdezes: `supabase.from('rooms').select('id, room_type_id')`
- `saveBulk()` INSERT-ben: `room_id` erteke a `rooms.find(r => r.room_type_id === bulkRoomTypeId)?.id`
- `savePricing()` INSERT-ben: hasonlo javitas
- Hibakezelesi log is javul, mert az `error` objektumot a `catch` agban kiloggoljuk

