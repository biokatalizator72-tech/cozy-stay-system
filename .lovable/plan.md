

# Artabla: atnevezes + "Tomeges kitoltes" funkcio

## Valtozasok osszefoglalasa

1. Az "Arazas" menupont atnevezese "Artabla"-ra
2. Minden szobatipus neve ala egy kattinthato "tomeges kitoltes" link kerul az artabla tablazatban
3. A linkre kattintva egy Dialog (pop-up) nyilik meg, a referenciakepek alapjan

## Reszletes terv

### 1. Atnevezes: "Arazas" -> "Artabla"

**Modositando fajlok:**
- `src/components/admin/AdminLayout.tsx` -- a 28. sorban `name: 'Árazás'` -> `name: 'Ártábla'`
- `src/pages/admin/AdminPricing.tsx` -- az oldal `h1` cimsor es leiras

### 2. "Tomeges kitoltes" link

Az artabla tablazat bal oldali sticky oszlopaban, minden szobatipus neve es alapara ala kerul egy kattinthato "tomeges kitoltes" felirat (kek szin, kis betumeret). Kattintasra megnyitja a Dialog-ot az adott szobatipussal elojelolve.

### 3. Tomeges kitoltes Dialog

A referenciakepek alapjan a Dialog tartalma:

```text
+----------------------------------------------------------+
|  Tomeges kitoltes - [Szobatipus neve]                    |
+----------------------------------------------------------+
|                                                          |
|  Mettol: [ 2026-02-09 ]    Meddig: [ 2026-03-09 ]       |
|                                                          |
|  Napok:                                                  |
|  [x] hetfo  [x] kedd  [x] szerda  [x] csutortok         |
|  [x] pentek [x] szombat [x] vasarnap                     |
|                                                          |
|  Kapacitas: [    ] db                                    |
|  Ar:        [    ] HUF                                   |
|  Min. tartozkodas: [    ] ej                             |
|                                                          |
|            [ Megsem ]  [ Mentes ]                        |
+----------------------------------------------------------+
```

**Mezok:**
- **Mettol / Meddig**: Datumvalaszto (Calendar Popover), alapertelmezetten az artabla aktualis datumtartomanyaval toltve
- **Napok**: 7 db Checkbox (hetfo-vasarnap), alapertelmezetten mind bejelolve. Igy lehet pl. csak hetvegi vagy hetkoznapi arat beallitani
- **Kapacitas**: Szam input, ures = nem modositja az elerheto szobak szamat
- **Ar**: Szam input (HUF), ures = nem modositja az arat
- **Min. tartozkodas**: Szam input, ures = nem modositja a minimum ejszakakat

**Mentes logika:**
1. Vegigiteralunk a datumtartomany minden napjan
2. Ellenorizzuk, hogy az adott nap (hetfo=1, ..., vasarnap=0) kivalasztott-e a checkboxokkal
3. Ha ar vagy min. ejszaka meg van adva: upsert a `pricing_rules` tablaba (start_date = end_date = az adott nap, room_type_id = a kivalasztott szobatipus)
4. Ha kapacitas meg van adva: upsert a `room_type_availability` tablaba
5. Sikeres mentes utan: toast uzenet, dialog bezarasa, adatok ujratoltese

### Technikai reszletek

**Modositando fajl:** `src/pages/admin/AdminPricing.tsx`

**Uj state valtozok:**
- `bulkDialogOpen: boolean` -- dialog lathatosag
- `bulkRoomTypeId: string | null` -- melyik szobatipusra vonatkozik
- `bulkDateFrom: Date | undefined` -- kezdo datum
- `bulkDateTo: Date | undefined` -- zaro datum
- `bulkDays: boolean[]` -- 7 elemu tomb (hetfo-vasarnap), alapbol mind `true`
- `bulkPrice: string` -- ar mezo
- `bulkMinNights: string` -- min. ejszakak mezo
- `bulkCapacity: string` -- kapacitas mezo
- `bulkSaving: boolean` -- mentes folyamatban jelzo

**Uj fuggvenyek:**
- `openBulkDialog(roomTypeId)` -- beallitja a state-et es megnyitja a dialogot
- `saveBulk()` -- a fent leirt mentes logika, `eachDayOfInterval` + `getDay()` alapu szures

**Felhasznalt komponensek (mar a projektben):**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `Calendar` + `Popover` + `PopoverContent` + `PopoverTrigger`
- `Checkbox` (Radix)
- `Input`
- `Button`

