

## Biztonsági hibák javítása a Publish blokkolás feloldásához

Két "error" szintű biztonsági hiba akadályozza a publisholást. Mindkettőt megoldjuk.

### 1. Hardcoded secret eltávolítása a `create-admin` Edge Functionból

A `create-admin` function jelenleg a kódba égetett `"INIT_ADMIN_2024"` titkos kulcsot használ. Ezt lecseréljük egy környezeti változóra (`ADMIN_CREATION_SECRET`).

**Lépések:**
- Hozzáadjuk az `ADMIN_CREATION_SECRET` titkos kulcsot a projekthez (ehhez meg kell adnod egy erős, véletlenszerű jelszót)
- Frissítjük a `supabase/functions/create-admin/index.ts` fájlt: az Authorization headerből olvassa a titkos kulcsot a body `secret` mező helyett, és a `Deno.env.get("ADMIN_CREATION_SECRET")` értékkel hasonlítja össze

### 2. Bookings tábla biztonsági figyelmeztetés lezárása

A `bookings` tábla már rendelkezik megfelelő RLS szabályokkal (SELECT csak adminoknak, INSERT csak pending státuszú foglalásokra). Ez hamis pozitív - a finding-et ignoráltra állítjuk a scannerben.

### Érintett fájlok
- `supabase/functions/create-admin/index.ts` - secret kezelés átírása
- Titkos kulcs hozzáadása a projekthez

