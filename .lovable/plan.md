

# Automatikus gorgetés a keresési eredményekhez

## Mi valtozik

A "Keresés" gombra kattintás után az oldal automatikusan legörget az eredmények szekcióhoz, hogy a vendég azonnal lássa a találatokat (vagy az "nincs szabad szoba" üzenetet).

## Megvalósítás

### `src/pages/Index.tsx`

1. Importálom a `useRef`-et a React-ből
2. Létrehozok egy `resultsRef`-et (`useRef<HTMLDivElement>`)
3. Az eredmények szekció `<section>` elemére rárakom a `ref={resultsRef}` attribútumot
4. A `handleSearch` függvény végén (miután az `setAvailableRoomTypes` és `setIsSearching(false)` lefutott) egy rövid `setTimeout`-tal görgetem az eredményekhez:

```typescript
setTimeout(() => {
  resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, 100);
```

A `setTimeout` azért kell, mert a React renderelésnek be kell fejeződnie, mielőtt a DOM elem elérhető lenne a görgetéshez.

## Érintett fájl

| Fájl | Változás |
|------|----------|
| `src/pages/Index.tsx` | `useRef` + `scrollIntoView` hozzáadása a keresés utáni görgetéshez |
