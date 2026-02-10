

# Create-booking Edge Function javitasa Vapi integracio szamara

## Problema

A Vapi hangasszisztens hivja a `create-booking` vegpontot, de a foglalas nem jelenik meg az adatbazisban. A fo okok valoszinuleg:

1. **Nincs naplozas** -- nem latjuk, mit kuld a Vapi
2. **Kotelezo mezok** -- a `room_type_id`, `guest_email`, `guest_phone`, `total_price` mind kotelezo, de a Vapi valoszinuleg nem kuldi mindet
3. A 400-as hibavalasz nem latszik a Vapi feluleten

## Tervezett valtoztatások

### 1. Beerkező adatok naplozasa

A request body-t rogton a `req.json()` utan kilogoljuk `console.log`-gal, igy a backend naplokban lathato lesz, mit kuld a Vapi.

### 2. Alapertelmezett room_type_id

Ha a Vapi nem kuld `room_type_id`-t, az elso aktiv szobatipust hasznaljuk alapertelmezettnek (jelenleg: "Deluxe B", `5b123575-2715-41c7-8b78-6df820b10b42`). Ehhez lekerdezzuk az adatbazisbol az elso aktiv szobatipust, igy nem fix ertek lesz.

### 3. Opcionalis mezok lazitasa

A kovetkezo mezoket opcionalisra allitjuk es alapertelmezett erteket adunk nekik, ha a Vapi nem kuldi:
- `guest_email` -- alapertelmezett: `"nincs@megadva.hu"`
- `guest_phone` -- alapertelmezett: `"nem megadott"`
- `total_price` -- ha nincs megadva, kiszamoljuk a szobatipus `base_price` es az ejszakak szama alapjan

### 4. Datum kezeles

A `check_in` es `check_out` datumokat validaljuk: ha nem YYYY-MM-DD formatumban erkeznek, megprobaljuk parse-olni. Ha ervenytelen, ertelmes hibauzenet jon vissza.

## Technikai reszletek

Egyetlen fajl modosul: `supabase/functions/create-booking/index.ts`

A fo valtozasok:

```
// 1. Naplozas
const body = await req.json();
console.log("create-booking request body:", JSON.stringify(body));

// 2. Alapertelmezett room_type_id lekerdezese
if (!room_type_id) {
  const { data } = await supabase
    .from("room_types")
    .select("id")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .single();
  room_type_id = data?.id;
}

// 3. Opcionalis mezok alapertelmezett ertekekkel
guest_email = guest_email || "nincs@megadva.hu";
guest_phone = guest_phone || "nem megadott";

// 4. total_price szamitas ha hianyzik
if (total_price == null) {
  const nights = (new Date(check_out) - new Date(check_in)) / 86400000;
  total_price = roomType.base_price * nights;
}
```

A naplozas utan a Vapi altal kuldott pontos adatokat latni fogjuk a backend logokban, es tovabb finomithatjuk a mukodest.
