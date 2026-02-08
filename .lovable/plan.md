
# Vendégoldali szobakeresés átalakítása

## Jelenlegi helyzet

Jelenleg a főoldalon (`Index.tsx`) az összes aktív szoba azonnal megjelenik. A vendég ezután választ szobát, és csak a foglalási oldalon (`BookingPage.tsx`) választja ki a dátumot.

## Új folyamat

A vendég először megadja a keresési feltételeket (dátum + létszám), majd csak ezután jelennek meg a releváns, szabad szobák.

```text
+-------------------------------------------+
|            Szálláshely Hero               |
+-------------------------------------------+
                    |
                    v
+-------------------------------------------+
|          Keresési Űrlap (új)              |
|  +----------------+  +------------------+ |
|  | Érkezés dátum  |  | Távozás dátum    | |
|  +----------------+  +------------------+ |
|  +----------------+  +------------------+ |
|  | Vendégek száma |  |     [Keresés]    | |
|  +----------------+  +------------------+ |
+-------------------------------------------+
                    |
         (keresés megnyomása után)
                    v
+-------------------------------------------+
|     Szabad szobák listája (szűrt)         |
|  - Létszámnak megfelelők előre            |
|  - Foglalt szobák kiszűrve                |
+-------------------------------------------+
```

## Részletes megvalósítás

### 1. Új komponens: `SearchForm.tsx`

Létrehozok egy keresési űrlap komponenst:

- **Érkezés dátum** - Popover naptárral
- **Távozás dátum** - Popover naptárral
- **Vendégek száma** - Számláló input (1-tól a legnagyobb szoba kapacitásáig)
- **Keresés gomb**

A naptár magyar nyelven, a dátumok a mai naptól választhatók.

### 2. Főoldal (`Index.tsx`) módosítása

Az oldal állapotai:
- `searchParams: { checkIn, checkOut, guests }` - null, amíg nincs keresés
- `availableRooms: Room[]` - szűrt szobalista

Működési logika:
1. Kezdetben csak a Hero + SearchForm látszik
2. Keresés után:
   - Lekérdezés a `bookings` és `ical_blocked_dates` táblákból a foglalt dátumokra
   - Szűrés: csak azok a szobák jelennek meg, amelyek szabadok az adott időszakban
   - Rendezés: a létszámnak leginkább megfelelő szobák előre (pl. 2 fő → 2 férőhelyes szobák előre, majd 3, 4, stb.)

### 3. Szűrési algoritmus

```text
1. Lekérdezem az összes aktív szobát
2. Lekérdezem a foglalásokat a választott időszakra:
   - bookings tábla: pending és confirmed státuszúak
   - ical_blocked_dates tábla: manuálisan blokkolt napok
3. Kiszűröm azokat a szobákat, amelyek:
   - Kapacitása >= megadott létszám
   - Nincs foglalásuk a választott időszakban
4. Rendezés:
   - Elsődleges: kapacitás közelsége a kért létszámhoz (pontos egyezés előnyben)
   - Másodlagos: eredeti sorrend (sort_order)
```

### 4. RoomCard módosítása

A `RoomCard` komponens kap új prop-okat:
- `checkIn`, `checkOut` - a keresési dátumok
- `guests` - a vendégek száma
- `calculatedPrice` - előre kiszámolt végösszeg

A "Foglalás" gomb URL-je query paramétereket is tartalmazhat:
`/book/{roomId}?checkIn=2025-03-01&checkOut=2025-03-05&guests=2`

### 5. BookingPage módosítása

Ha query paraméterek érkeznek:
- A naptár előre ki lesz töltve
- A létszám megjelenik
- A vendégnek már csak az adatait kell megadnia

---

## Technikai részletek

### Érintett fájlok

| Fájl | Művelet |
|------|---------|
| `src/components/guest/SearchForm.tsx` | Létrehozás |
| `src/pages/Index.tsx` | Módosítás |
| `src/components/guest/RoomCard.tsx` | Módosítás |
| `src/pages/BookingPage.tsx` | Módosítás |

### SearchForm komponens szerkezete

```text
<Card>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Érkezés dátum: Popover + Calendar -->
      <!-- Távozás dátum: Popover + Calendar -->
      <!-- Vendégek száma: Input type="number" -->
      <!-- Keresés gomb -->
    </div>
  </CardContent>
</Card>
```

### Szobák szűrése és rendezése (pszeudo-kód)

```text
function filterAndSortRooms(rooms, checkIn, checkOut, guests):
  // 1. Kapacitás szűrés
  filtered = rooms.filter(room => room.capacity >= guests)
  
  // 2. Elérhetőség ellenőrzése
  for each room in filtered:
    bookedDates = getBookedDates(room.id, checkIn, checkOut)
    if bookedDates.length > 0:
      remove room from filtered
  
  // 3. Rendezés: pontos kapacitás-egyezés előnyben
  sorted = filtered.sort((a, b) => {
    diffA = |a.capacity - guests|
    diffB = |b.capacity - guests|
    return diffA - diffB
  })
  
  return sorted
```

### URL paraméterek a foglalási oldalon

A `BookingPage` komponens a `useSearchParams` hook-kal olvassa ki a query paramétereket, és automatikusan beállítja a dátumokat.
