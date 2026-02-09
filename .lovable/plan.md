

# Foglalasi oldal modositasok

## Valtozasok

### Fajl: `src/pages/BookingPage.tsx`

**1. Telefon mezo kotelezo**
- A "Telefon" label mellé csillag (`*`) kerul
- Az Input mezohoz `required` attributum
- A `handleSubmit` validacioban a `guest_phone` is ellenorzesre kerul (a `guest_name` es `guest_email` melle)

**2. "Varhato erkezesi ido" mezo torlese**
- A teljes `arrival_time` mezo blokk (497-507. sorok) torlesre kerul
- A `formData` state-bol is kikerul az `arrival_time`
- A `handleSubmit`-ben az `arrival_time` mar nem kerul mentes

**3. Torzsvendeg kedvezmeny checkbox**
- Uj state: `isReturningGuest` (boolean, default false)
- A "Specialis keresek" mezo ele kerul egy Checkbox + Label sor: "Torzsvendeg kedvezmeny (-10%)"
- Ha be van pipalva, a `calculateTotal()` fuggvenyben a vegosszegbol meg 10%-ot levonunk (az ejszaka kedvezmeny utan)
- Az ar osszesitesben megjelenik a torzsvendeg kedvezmeny informacio (kulon sor, pl. "Torzsvendeg kedvezmeny: -10%")
- A `handleSubmit`-ben a `special_requests` mezobe automatikusan beleirodhat a "[Torzsvendeg kedvezmeny igenyelve]" szoveg, vagy kulon mezoben taroljuk

### Arszamitas logika

A `calculateTotal()` visszateresi erteke bovul: `loyaltyDiscountPercent` mezo. A szamitas sorrendje:
1. Alap szobaar + gyerek felarak (jelenlegi logika)
2. Ejszaka kedvezmeny alkalmazasa (jelenlegi logika)
3. Torzsvendeg kedvezmeny alkalmazasa (uj): ha `isReturningGuest`, meg -10% a vegosszegbol

### Megjelenites az ar osszesitesben

Ha torzsvendeg kedvezmeny aktiv:
- Kulon sor a datum osszesitesben: "Torzsvendeg kedvezmeny" felirattal es "-10%" badge-dzsel
- Az athuzott ar az osszes kedvezmeny elotti ar, a vegso ar az osszes kedvezmeny utani

