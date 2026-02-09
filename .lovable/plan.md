

# Eloleg szazalek beallitas az Artabla oldalon

## Osszefoglalas

Egy uj `deposit_percent` mezo kerul a `property_settings` tablaba, amelyet az Artabla oldal aljan egy egyszeru lenyilo menuvel (Select) lehet allitani. Az edge function ezt az erteket hasznalja a `{deposit}` placeholder kiszamitasahoz.

## Valtozasok

### 1. Adatbazis migracio

Uj oszlop a `property_settings` tablaban:

```sql
ALTER TABLE property_settings
ADD COLUMN deposit_percent integer NOT NULL DEFAULT 50;
```

### 2. `src/pages/admin/AdminPricing.tsx`

Az artabla kartya ala kerul egy kis szekcio:

- Betoltes: a `fetchData`-ban lekerdezzuk a `property_settings` tablabol a `deposit_percent` erteket
- Megjelenites: egy `Select` komponens az alabbi opcikkal: 12%, 20%, 30%, 50%, 100%
- Mentes: valtozaskor azonnal menti a `property_settings` tablaba (`UPDATE ... SET deposit_percent = X`)

Vizualisan az artabla-kartya alatt jelenik meg egy egyszeru sor:

```
Eloleg merteke: [v 50% ]
```

### 3. `supabase/functions/send-booking-confirmation/index.ts`

- A `property_settings` lekerdezesbe bekerül a `deposit_percent` mezo
- A `total_price`-bol kiszamolja: `deposit = Math.round(totalPriceNum * depositPercent / 100)`
- Uj placeholder csere: `.replace(/{deposit}/g, depositFormatted)`

### 4. `src/pages/admin/AdminSettings.tsx`

Az Email sablon tab leirasat kiegeszitjuk a `{deposit}` valtozoval, hogy a felhasznalo tudja hasznalni.

## Erintett fajlok

| Fajl | Valtozas |
|------|----------|
| Adatbazis migracio | `deposit_percent` oszlop hozzaadasa |
| `src/pages/admin/AdminPricing.tsx` | Select komponens az eloleg szazalekhoz |
| `supabase/functions/send-booking-confirmation/index.ts` | `{deposit}` kiszamolasa a `deposit_percent` alapjan |
| `src/pages/admin/AdminSettings.tsx` | `{deposit}` valtozo felsorolasa az email sablon leirasban |

