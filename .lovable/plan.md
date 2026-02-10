

# Create-booking: nem-UUID room_type_id kezeles

## Problema

A Vapi hangasszisztens `"standard_double_room"` szoveges azonositot kuld a `room_type_id` mezoben UUID helyett. Az adatbazis UUID tipusu oszlopot var, ezert a lekerdezes hibat dob: `invalid input syntax for type uuid`.

## Megoldas

A `room_type_id` validalasa: ha nem ervenyes UUID formatumu, akkor:
1. Probaljuk megtalalni a szobatipust nev alapjan (case-insensitive kereses a `room_types` tablaban)
2. Ha nem talaljuk, hasznaljuk az alapertelmezett (elso aktiv) szobatipust -- ez a logika mar megvan a kodban

## Technikai reszletek

Egyetlen fajl modosul: `supabase/functions/create-booking/index.ts`

A `room_type_id` feldolgozasa soran, az alapertelmezett lekerdezes elott:

```text
// UUID formatum ellenorzes
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (room_type_id && !uuidRegex.test(room_type_id)) {
  console.log(`create-booking: room_type_id is not UUID: "${room_type_id}", searching by name`);
  const { data: matchedRT } = await supabase
    .from("room_types")
    .select("id")
    .eq("is_active", true)
    .ilike("name", `%${room_type_id.replace(/_/g, " ")}%`)
    .limit(1)
    .maybeSingle();

  room_type_id = matchedRT?.id || null;
}
```

Ha a szoveges azonosito (pl. `"standard_double_room"`) alapjan nem talalja a szobatipust, a mar meglevo alapertelmezett logika veszi at (elso aktiv szobatipus).

Ez biztositja, hogy a Vapi barmi formatumban kuldje a `room_type_id`-t, a foglalas letrejon.
