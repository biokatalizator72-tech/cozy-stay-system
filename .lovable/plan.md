

## A probléma: `security_invoker` blokkolja az adatokat nem bejelentkezett felhasználóknak

### Gyökérok

A `property_settings_public` és `bookings_availability` nézetek `security_invoker = true` beállítással lettek újra létrehozva (migration `20260220095920`). Ez azt jelenti, hogy a nézetek a **lekérdező felhasználó jogosultságaival** futnak.

Ugyanakkor a `property_settings` tábla SELECT policy-ja csak adminoknak engedélyezi az olvasást:
```sql
CREATE POLICY "Only admins can view property settings"
ON public.property_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
```

Tehát:
- **Bejelentkezett admin (saját gép)**: nézet visszaadja az adatokat → Kapcsolat szekció megjelenik
- **Inkognitó / más gép (anon user)**: nézet üres eredményt ad → `property` = null → Kapcsolat szekció nem renderelődik, mert feltételes: `property?.address || property?.phone || property?.email`

A `bookings_availability` nézet is érintett -- a `bookings` tábla SELECT policy-ja szintén csak adminoknak engedélyezett, így az anon felhasználók nem kapnak foglalási adatokat sem (ez a keresési eredményeket is torzíthatja).

### Megoldás

Egy új database migration, amely mindkét nézetet újra létrehozza `security_invoker` NÉLKÜL. Így a nézetek a nézet tulajdonosának jogosultságaival futnak (megkerülik az RLS-t), ami biztonságos, mivel a nézetek már szűrik a visszaadott oszlopokat.

```sql
-- property_settings_public: security_invoker eltávolítása
DROP VIEW IF EXISTS public.property_settings_public;
CREATE VIEW public.property_settings_public AS
SELECT id, name, description, address, phone, email,
       latitude, longitude, guest_fields, created_at, updated_at
FROM public.property_settings;
GRANT SELECT ON public.property_settings_public TO anon, authenticated;

-- bookings_availability: security_invoker eltávolítása
DROP VIEW IF EXISTS public.bookings_availability;
CREATE VIEW public.bookings_availability AS
SELECT room_type_id, check_in, check_out, status
FROM public.bookings
WHERE status IN ('pending', 'confirmed');
GRANT SELECT ON public.bookings_availability TO anon, authenticated;
```

### Módosítás

| Tipus | Leírás |
|---|---|
| Database migration | Mindkét nézet újra létrehozása `security_invoker` nélkül |

Nem szükséges frontend kód módosítás.

