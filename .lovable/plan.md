
# Vendegoldal atalakitasa: szobatipusok megjelenitese szobak helyett

## Osszefoglalo

A vendeg oldalon a kereses eredmenyekent nem egyedi szobak, hanem **szobatipusok** jelennek meg. A vendeg szobatipust foglal, nem konkret szobat.

## Valtozasok

### 1. Index.tsx - Fo oldal

**Adatlekerdezes atalakitasa:**
- `rooms` tabla helyett `room_types` tablat kerdezzuk le (is_active = true)
- `room_images` helyett `room_type_images` tablat hasznaljuk
- A `Room` interface helyett `RoomType` interface (id, name, description, base_capacity, extra_beds, adult_extra_beds, capacity, base_price, amenities, sort_order)

**Elerhetseg vizsgalat:**
- A `room_type_availability` tablat kerdezzuk le a kivalasztott idoszakra
- Egy szobatipus akkor elerheto, ha **minden** napra van legalabb 1 szabad szoba (available_count >= 1)
- A `bookings` tabla foglalasait is figyelembe vesszuk: az adott room_type_id-hoz tartozo szobak foglalasai csokkentik a kontingenseket
- A kapacitas szurest a szobatipus `capacity` mezojebol szamoljuk

**Szovegek frissitese:**
- "Elerheto szobak" --> "Elerheto szobatipusok" (vagy megmaradhat "Elerheto szobak" ha a felhasznalo szamara igy termeszetesebb)

### 2. RoomCard.tsx - Szobakartya

**Interface atalakitasa:**
- `Room` --> `RoomType` (ugyanazok a mezok: id, name, description, capacity, base_price, amenities)
- `RoomImage` marad (id, image_url, sort_order)
- A prop nev maradhat `room` vagy atnevezheto `roomType`-ra

**Foglalasi link:**
- `/book/:roomId` --> `/book/:roomTypeId`
- A URL parameterek maradnak: checkIn, checkOut, adults, children

### 3. BookingPage.tsx - Foglalasi oldal

**Route parameterek:**
- `roomId` --> `roomTypeId`
- A `rooms` tabla helyett `room_types` tablat kerdezi le
- A `room_images` helyett `room_type_images` tablat hasznaljuk
- A `pricing_rules` lekerdezesben `room_type_id`-t hasznalunk `room_id` helyett

**Foglalas mentese:**
- A `bookings` tablaba `room_id` helyett (vagy mellett) a `room_type_id`-t mentjuk
- Ehhez a `bookings` tablaban szukseg lesz egy `room_type_id` oszlopra (adatbazis migracio)

### 4. App.tsx - Route

- `/book/:roomId` --> `/book/:roomTypeId`

### 5. Adatbazis migracio

A `bookings` tablahoz hozzaadjuk a `room_type_id` oszlopot:
```sql
ALTER TABLE public.bookings 
  ADD COLUMN room_type_id uuid REFERENCES public.room_types(id);
```

Ez lehetove teszi, hogy a foglalas szobatipushoz kossuk, es kesobbi lepesben az admin rendelje hozza a konkret szobat.

## Technikai reszletek

### Elerhetseg szamitasi logika

```
1. Lekerdezzuk az osszes room_type_availability rekordot a keresett datumtartomanyra
2. Lekerdezzuk az osszes foglalast (pending/confirmed) ami atfed a datumtartomanyal
3. Minden szobatipusra, minden napra:
   - admin_count = room_type_availability.available_count (ha nincs rekord, 0)
   - booked_count = az adott napra eso foglalasok szama
   - free = admin_count - booked_count
4. Egy szobatipus elerheto, ha MINDEN napra free >= 1
```

### Modositando fajlok

| Fajl | Valtozas |
|------|----------|
| `src/pages/Index.tsx` | room_types + room_type_images + room_type_availability lekerdezes |
| `src/components/guest/RoomCard.tsx` | Interface atnevezes, URL /book/:roomTypeId |
| `src/pages/BookingPage.tsx` | room_types lekerdezes, room_type_id mentes |
| `src/App.tsx` | Route atnevezes |
| Adatbazis migracio | bookings.room_type_id oszlop |
