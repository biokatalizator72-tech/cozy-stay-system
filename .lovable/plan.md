

# A {total_price} es {deposit} hiba vegleges javitasa

## A problema gyokere

Az edge function szerver oldalon azonnal frissult, de a bongeszoben futo frontend (BookingPage) meg a regi kodot hasznalta, ami formatazott stringet kuldott ("54 000"). Az uj edge function `parseFloat("54 000")` = 54, igy mindket ertek hibas lett.

## Megoldas

Az edge function-ben a `total_price` erteketol szurijuk ki a nem szam karaktereket (szokoz, stb.) mielott `parseFloat`-ot hivunk. Igy mindket formatum mukodik: nyers szam (54000) es formatazott string ("54 000").

### `supabase/functions/send-booking-confirmation/index.ts` (39. sor)

**Jelenleg:**
```typescript
const totalPriceNum = parseFloat(total_price) || 0;
```

**Javitva:**
```typescript
const rawPrice = String(total_price).replace(/[^\d.,]/g, '').replace(',', '.');
const totalPriceNum = parseFloat(rawPrice) || 0;
```

Ez a sor minden nem szam karaktert (szokoz, specialis szokoz, stb.) eltavolit, majd a magyar tizedes vesszot pontra csereli. Igy:
- `"54 000"` -> `"54000"` -> `54000`
- `54000` -> `"54000"` -> `54000`
- `"72 000"` -> `"72000"` -> `72000`

## Erintett fajl

| Fajl | Valtozas |
|------|----------|
| `supabase/functions/send-booking-confirmation/index.ts` | Robusztus szam-parszolas a `total_price` feldolgozasanal |

