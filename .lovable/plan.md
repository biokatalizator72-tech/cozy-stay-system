

# Visszaigazolo email kuldes megvalositasa

## Elofeltetelek

- **RESEND_API_KEY** secret hozzaadasa: `re_ZpFmpRa7_i4PyWgPENh29HJdoeaAC5Jx1`

## Lepesek

### 1. Secret eltarolasa
A megadott Resend API kulcsot eltaroljuk a backend secretek kozott `RESEND_API_KEY` neven.

### 2. Uj edge function: `supabase/functions/send-booking-confirmation/index.ts`

Az edge function a kovetkezoket csinalja:
- Fogadja a foglalasi adatokat a request body-ban (guest_name, guest_email, room_name, check_in, check_out, total_price)
- Lekerdezi a `property_settings` tablabol a `booking_email_template` es `name` (szallas neve) mezoket
- Behelyettesiti a valtozokat a sablonba: `{guest_name}`, `{room_name}`, `{check_in}`, `{check_out}`, `{total_price}`, `{property_name}`
- Resend API-n keresztul elkuldi az emailt a vendeg email cimere

A jelenlegi email sablon az adatbazisban:
```
Kedves {guest_name},
Koszonjuk foglalasat! Az alabbi foglalasi adatokat rogzitettuk:
- Szoba: {room_name}
- Erkezes: {check_in}
- Tavozas: {check_out}
- Vegosszeg: {total_price} Ft
...
```

**Fontos:** Amig a Resend-ben a domain nincs hitelesitve, az emailek a Resend teszt domainjevel kerulnek kikusdesre. A felado cim `onboarding@resend.dev` lesz amig sajat domain nincs beallitva.

### 3. `supabase/config.toml` frissitese
Az uj edge function hozzaadasa `verify_jwt = false` beallitassal (a foglalasi oldal nem kovetel bejelentkezest).

### 4. `src/pages/BookingPage.tsx` modositasa
A sikeres foglalas mentes utan (`else` ag, 262. sor kornyeke) meghivjuk az edge function-t:

```typescript
// Email kuldese -- hiba eseten is sikeres a foglalas
try {
  await supabase.functions.invoke('send-booking-confirmation', {
    body: {
      guest_name: formData.guest_name,
      guest_email: formData.guest_email,
      room_name: roomType.name,
      check_in: format(dateRange.from, 'yyyy. MMMM d.', { locale: hu }),
      check_out: format(dateRange.to, 'yyyy. MMMM d.', { locale: hu }),
      total_price: total.toLocaleString('hu-HU'),
    },
  });
} catch (emailError) {
  console.error('Email kuldesi hiba:', emailError);
}
```

Az email kuldesi hiba nem akadalyozza a foglalast -- a vendeg mindenkepp latja a sikeres foglalasi visszajelzest.

## Erintett fajlok

| Fajl | Valtozas |
|------|----------|
| `supabase/functions/send-booking-confirmation/index.ts` | Uj edge function letrehozasa |
| `supabase/config.toml` | Uj function konfiguracio |
| `src/pages/BookingPage.tsx` | Edge function hivas a sikeres foglalas utan |

