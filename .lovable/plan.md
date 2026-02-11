

# Admin ertesitesi email foglalas letrehozasakor

## Attekintes

Uj "Admin" ful a Beallitasok oldalon, ahol megadhato egy admin email cim. Minden uj foglalas letrehozasakor a rendszer ertesito emailt kuld erre a cimre a foglalas adataival.

## Valtozasok

### 1. Adatbazis: uj oszlop a `property_settings` tablaban

Uj `admin_email` (text, nullable) oszlop hozzaadasa migracioval.

### 2. Frontend: "Admin" ful a Beallitasok oldalon

`src/pages/admin/AdminSettings.tsx` fajlban:
- Uj TabsTrigger: "Admin"
- Uj TabsContent egy email bekeresi mezovel (Label + Input)
- A `PropertySettings` interface bovitese `admin_email` mezovel
- A `handleSave` fuggveny bovitese az `admin_email` mentesehez

### 3. Edge Function: admin ertesito email kuldese foglalas utan

`supabase/functions/create-booking/index.ts` fajlban, a sikeres foglalas letrehozasa utan:
- Lekerdezzuk a `property_settings`-bol az `admin_email`-t
- Ha van megadva admin email, Resend-del elkuldunk egy ertesito emailt
- A level tartalma:
  - **Targy**: "Foglalas tortent"
  - **Torzs**: Foglalas adatai (datum, szoba, ar, vendeg neve, email cime, telefonszama)

## Technikai reszletek

### Adatbazis migracio
```sql
ALTER TABLE public.property_settings
  ADD COLUMN admin_email text;
```

### Admin tab UI (AdminSettings.tsx)
Uj tab a meglevo tablistaba:
```
<TabsTrigger value="admin">Admin</TabsTrigger>
```
Tartalom: egy Card egy email mezovel, ahol az admin_email erteket lehet szerkeszteni.

### Create-booking edge function bovitese
A sikeres `insert` utan:
```typescript
// Fetch admin email
const { data: settings } = await supabase
  .from("property_settings")
  .select("admin_email, name")
  .limit(1)
  .single();

if (settings?.admin_email) {
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  await resend.emails.send({
    from: `${settings.name || "PMS"} <info@siralyhotel.hu>`,
    to: [settings.admin_email],
    subject: "Foglalás történt",
    html: `<h2>Foglalás adatai</h2>
      <ul>
        <li><b>Dátum:</b> ${check_in} - ${check_out}</li>
        <li><b>Szoba:</b> ${roomType.name}</li>
        <li><b>Ár:</b> ${Number(total_price).toLocaleString("hu-HU")} Ft</li>
        <li><b>Vendég neve:</b> ${guest_name}</li>
        <li><b>Vendég email:</b> ${guest_email}</li>
        <li><b>Vendég telefon:</b> ${guest_phone}</li>
      </ul>`,
  });
}
```

### Modosulofajlok
1. `src/pages/admin/AdminSettings.tsx` -- uj Admin tab
2. `supabase/functions/create-booking/index.ts` -- admin email ertesites
3. Adatbazis migracio -- `admin_email` oszlop

