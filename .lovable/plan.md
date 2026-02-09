

# Keresourlap atalakitasa: egyetlen sor + letszam popover + piros gomb

## Cel

A keresourlap egyetlen sorba rendezes a referencikakep alapjan: Erkezes | Tavozas | Letszam (lenyilo) | Kereses gomb. A letszamvalasztas egy popoverbe kerul, a gomb pedig piros szinu lesz.

## Uj elrendezes

```text
Desktop (1 sor):
[ Erkezes ] [ Tavozas ] [ 2 felnott, 1 gyerek v ] [ Kereses ]

Mobil (egymas ala):
[ Erkezes          ]
[ Tavozas          ]
[ 2 felnott v      ]
[ Kereses          ]
```

## Technikai reszletek

### Modositando fajl

`src/components/guest/SearchForm.tsx`

### Valtozasok

1. **Elrendezes**: A jelenlegi ket soros grid helyett egyetlen 4 oszlopos sor (mobilon egymas ala):
   - `grid grid-cols-1 md:grid-cols-4 gap-4`
   - Label-ek torlesre kerulnek, helyettuk a gomb szovege/placeholderje elegendo (kompaktabb)

2. **Letszam popover** (3. oszlop):
   - Trigger gomb: `Users` ikon + osszesitett szoveg (pl. "2 felnott" vagy "2 felnott, 1 gyerek")
   - `PopoverContent` (`w-80`): tartalmazza a felnott szamlalot es az osszes gyerek korcsoport szamlalot
   - A jelenlegi 2. sor (guest counts grid) teljes egeszeben a popoverbe koltozik
   - Az "Osszesen" indikator is a popover aljara kerul

3. **Kereses gomb** (4. oszlop):
   - Piros szin: `className="bg-red-600 hover:bg-red-700 text-white"` (felulirja a default primary-t)
   - Megmarad a `Search` ikon + "Keresés" rovid felirat (vagy "Szabad szobák keresése" ha elfer)

4. **Label-ek**: Eltunik a kulon label sor, helyette a mezok sajat placeholder/szoveguk mutatja a funkciojukat (Erkezes datumnal "Erkezes...", Tavozasnal "Tavozas...", stb.) - ez kompaktabba teszi az egy sorba rendezest.
