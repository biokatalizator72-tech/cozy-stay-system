

## Foglalások szerkesztése és törlése az admin felületen

A jelenlegi admin foglalás-kezelő oldalon csak megtekintés és státusz-változtatás lehetseges. Az alabbiak szerint bovitjuk a funkcionalitast.

### Uj funkciok

**1. Foglalás szerkesztése (minden statuszra)**
- Szerkesztheto mezok: erkezes datuma, tavozas datuma, szobatipus, vegosszeg
- A szerkesztes egy kulon dialogen tortenik, amely a reszletek dialogbol nyilik
- A szobatipus valasztashoz a `room_types` tablabol toltjuk be az aktiv szobatipusokat

**2. Foglalás törlése (minden statuszra)**
- Megerosito dialog (AlertDialog) a torles elott
- A torles vegleges, nem visszavonhato

### Technikai reszletek

**Adatbazis**: Nem szukseges migracio. Az RLS mar engedelyezi az adminoknak az UPDATE es DELETE muveleteket a `bookings` tablan.

**Modositando fajl**: `src/pages/admin/AdminBookings.tsx`

Valtozasok:
- Uj `Booking` interface bovitese `room_type_id` mezoval
- Uj `room_types` lekerese a szobatipus-valasztohoz
- Uj szerkeszto dialog (check_in, check_out, room_type_id, total_price mezokkel)
- Uj torles funkcio megerosito dialoggal
- A reszletek dialogban "Szerkesztes" es "Torles" gombok megjelenese minden statusznal
- A tabla lekeresbe a `room_types (id, name)` kapcsolat is bekerül a szobatipus nev megjelenithesehez

**UI elemek**:
- Ceruza ikon a szerkeszteshez, Kuka ikon a torleshez a tabla soraiban
- Szerkeszto dialog: datumvalaszto inputok, szobatipus legordulo (Select), osszeg szam mezo
- Torles megerosito: AlertDialog "Biztosan torolni szeretned?" szoveggel
