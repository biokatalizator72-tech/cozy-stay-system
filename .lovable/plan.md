
# Create-booking Edge Function frissitese: Vapi message wrapper kezeles

## Problema

A Vapi hangasszisztens ket kulonbozo formatumban kuldheti az adatokat:

1. **Kozvetlen** (mukodik): `{ "guest_name": "Teszt Vapi", "check_in": "2026-06-10", ... }`
2. **Becsomagolt** (NEM mukodik): `{ "message": { "toolCalls": [{ "function": { "arguments": { "guest_name": "Kovacs Lajos", ... } } }] } }`

A jelenlegi kod csak az elso formatumot kezeli. A masodik formatumnal a mezok hianyoznak, es 400-as hiba jon vissza.

## Megoldas

A `create-booking` Edge Function elejen hozzaadunk egy ellenorzest: ha a `body.message` letezik es tartalmaz `toolCalls` tombot, akkor onnan bontjuk ki az argumentumokat. Kulonben a meglevo kozvetlen logika marad.

## Technikai reszletek

Egyetlen fajl modosul: `supabase/functions/create-booking/index.ts`

A `body` parse-olasa utan, de a mezo kinyeres elott:

```text
const body = await req.json();
console.log("create-booking request body:", JSON.stringify(body));

// --- Vapi wrapper kicsomagolasa ---
let payload = body;
if (body.message?.toolCalls?.[0]?.function?.arguments) {
  payload = body.message.toolCalls[0].function.arguments;
  console.log("create-booking: unwrapped Vapi message format");
}

let { room_type_id, check_in, check_out, guest_name, ... } = payload;
```

Igy mindket Vapi kuldes-formatum mukodni fog, es a kovetkezo teszthivasnal a "Kovacs Lajos" tipusu foglalasok is bekerulnek az adatbazisba.
