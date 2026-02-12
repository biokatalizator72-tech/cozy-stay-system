

## A published oldal hibáinak javítása

Három fő problémát találtam, amelyek miatt az éles oldalon nem működnek a dolgok.

### 1. A szálláshely adatai nem jelennek meg (property_settings)

**Ok**: A `property_settings_public` nézet `security_invoker=on` beállítással lett létrehozva. Ez azt jelenti, hogy a nézet a lekérő felhasználó jogosultságaival fut -- de az alaptáblán (`property_settings`) csak adminoknak van SELECT joga. Így a vendégek (nem bejelentkezett felhasználók) a nézeten keresztül sem látnak semmit.

**Javítás**: Újra létrehozzuk a nézetet `security_invoker=off` beállítással (vagy anélkül), hogy a nézet a tulajdonos (postgres) jogaival fusson, és az adatok publikusan olvashatók legyenek. A nézet már most is kizárja az érzékeny mezőket (pl. `admin_email`, `booking_email_template`, `deposit_percent`).

### 2. A foglalás-keresés nem működik helyesen (bookings tábla)

**Ok**: A keresési logika a `bookings` táblából próbálja lekérni a meglévő foglalásokat az elérhetőség kiszámításához, de a `bookings` tábla SELECT szabálya csak adminoknak engedélyezi az olvasást. Így a vendég-oldali keresés nem látja a meglévő foglalásokat, és olyan szobákat is elérhetőnek mutat, amelyek valójában foglaltak.

**Javítás**: Létrehozunk egy `bookings_availability` nézetet, amely csak a `room_type_id`, `check_in`, `check_out` és `status` mezőket tartalmazza (személyes adatok nélkül), és `security_invoker=off` beállítással fut. A keresési logikát átírjuk, hogy ezt a nézetet használja.

### 3. Az admin belépés nem működik az éles oldalon

**Ok**: A Lovable Cloud rendszerében a Test és Live környezet **adatai elkülönülnek**. Az admin felhasználó (`admin@pms.hu`) csak a Test környezetben létezik -- a publikálás csak a kódot és a sémát viszi át, az adatokat (felhasználók, szobák, beállítások) nem.

**Javítás**: Az admin felhasználót a Live környezetben is létre kell hozni a `create-admin` Edge Function meghívásával. Ehhez a publikálás után a Live környezetben kell futtatni a funkciót.

---

### Technikai részletek

**Adatbázis migráció:**

```sql
-- 1. Nézet újraépítése security_invoker nélkül
DROP VIEW IF EXISTS property_settings_public;
CREATE VIEW property_settings_public AS
  SELECT id, name, description, address, phone, email,
         latitude, longitude, guest_fields, created_at, updated_at
  FROM property_settings;
GRANT SELECT ON property_settings_public TO anon, authenticated;

-- 2. Foglalás-elérhetőség nézet létrehozása
CREATE VIEW bookings_availability AS
  SELECT room_type_id, check_in, check_out, status
  FROM bookings
  WHERE status IN ('pending', 'confirmed');
GRANT SELECT ON bookings_availability TO anon, authenticated;
```

**Kódmódosítás:**
- `src/pages/Index.tsx` (178-184. sor): A `bookings` tábla lekérést `bookings_availability` nézetre cseréljük.

**Live környezet admin létrehozása:**
- Publikálás után meghívjuk a `create-admin` Edge Functiont a Live URL-en, az `ADMIN_CREATION_SECRET` használatával.

