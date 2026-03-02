
## Admin értesítő email javítása webes foglalásokhoz

### Probléma
A webes foglalási űrlap (`BookingPage.tsx`) közvetlenül beszúrja a foglalást az adatbázisba, majd csak a `send-booking-confirmation` edge function-t hívja meg, ami kizárólag a vendégnek küld visszaigazolást. Az admin értesítés csak a `create-booking` edge function-ben van implementálva, amit kizárólag a Vapi hangasszisztens használ.

### Megoldás
A `send-booking-confirmation` edge function-t kibővítjük, hogy az admin email-t is elküldje a vendég visszaigazolás mellett. Így minden foglalás -- legyen az webes vagy Vapi-s -- admin értesítést is generál.

### Lépések

**1. `supabase/functions/send-booking-confirmation/index.ts` kibővítése**
- A vendég email elküldése után lekérdezzük a `property_settings` táblából az `admin_email` mezőt (már most is lekérdezi a `name`-et, tehát a query-t ki kell bővíteni)
- Ha van `admin_email`, küldünk egy admin értesítő emailt is a foglalás adataival
- Az admin email tartalma a `create-booking` function-ben már meglévő formátumot követi

**2. `create-booking/index.ts` admin email duplikáció eltávolítása (opcionális)**
- Ha a `create-booking` is meghívja a `send-booking-confirmation`-t, akkor ott az admin email részt el lehet távolítani a duplikáció elkerülésére
- Alternatíva: a `create-booking`-ban meghagyni, mivel az közvetlenül is működik

### Technikai részletek

A `send-booking-confirmation/index.ts`-ben a vendég email elküldése után:

```typescript
// Admin értesítés küldése
if (settings?.admin_email) {
  try {
    await resend.emails.send({
      from: `${propertyName} <info@siralyhotel.hu>`,
      to: [settings.admin_email],
      subject: "Új foglalás érkezett",
      html: `<h2>Foglalás adatai</h2>
<ul>
  <li><b>Dátum:</b> ${check_in} – ${check_out}</li>
  <li><b>Szoba:</b> ${room_name}</li>
  <li><b>Ár:</b> ${totalPriceNum.toLocaleString("hu-HU")} Ft</li>
  <li><b>Vendég neve:</b> ${guest_name}</li>
  <li><b>Vendég email:</b> ${guest_email}</li>
</ul>`,
    });
    console.log("Admin notification sent to", settings.admin_email);
  } catch (adminErr) {
    console.error("Admin notification error:", adminErr);
  }
}
```

A `property_settings` lekérdezés bővítése:
```typescript
.select("booking_email_template, name, deposit_percent, admin_email")
```

### Módosítandó fájl

| Fajl | Modositas |
|---|---|
| `supabase/functions/send-booking-confirmation/index.ts` | `admin_email` lekérdezés és admin értesítő email küldés hozzáadása |
