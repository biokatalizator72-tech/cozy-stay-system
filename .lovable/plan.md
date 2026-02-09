
# Hero szekció javitasok

## 1. "Szobáink megtekintese" gomb torlese

A `PropertyHero.tsx` komponensbol torlom a teljes gomb blokkot (56-60. sor):

```tsx
<div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
  <Button size="lg" variant="secondary" ...>
    Szobáink megtekintése
  </Button>
</div>
```

A `Button` import is eltavolithato, ha a navigacios gombok (ChevronLeft/Right) nem hasznaljak -- de azok igen, tehat a `Button` import marad.

## 2. Hatterkep blur/fako megjelenes eltavolitasa

A jelenlegi kep `mix-blend-overlay opacity-30` osztalyokat hasznal, ami nagyon fakova teszi. Ezt lecserelem, hogy a kep eletesebben latszodjon:

**Jelenleg (33. sor):**
```
className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
```

**Javitva:**
```
className="absolute inset-0 w-full h-full object-cover"
```

A gradient overlay (35. sor) megmarad, hogy a szoveg olvashato legyen a kep felett.

## 3. Hero kep optimalis merete

Ez nem kod-valtozas, csak informacio:
- **Ajanlott meret:** 1920 x 1080 px (16:9)
- **Retina:** 2560 x 1440 px
- **Formatum:** JPEG, 80-85% minoseg
- **Fajlmeret:** max 300-500 KB

## Erintett fajl

| Fajl | Valtozas |
|------|----------|
| `src/components/guest/PropertyHero.tsx` | Gomb torlese + kep opacity/blend eltavolitasa |
