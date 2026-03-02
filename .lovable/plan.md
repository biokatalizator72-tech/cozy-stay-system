

## Tömeges kitöltés javítása -- részleges frissítés támogatása

### Probléma
A `saveBulk` funkció (`AdminPricing.tsx`, 283-363. sorok) nem kezeli helyesen, ha csak egy paramétert adunk meg:
- Ha csak a **min. napok** van kitöltve, de nincs meglevo pricing rule az adott napra, nem tortenik semmi (mert az `else if (priceNum)` ag nem teljesul)
- Ha nincs meglevo rule es csak min. napokat allitunk, az uj rule-hoz nem tudja az arat -- ilyenkor a szobatipus alaparat kell hasznalni

### Megoldas

A `saveBulk` fuggvenyt (`src/pages/admin/AdminPricing.tsx`, 283-363. sorok) modositjuk:

1. **Meglevo rule eseten**: csak a kitoltott mezoket frissitjuk (ez mar nagyreszben mukodik)
2. **Uj rule eseten**: ha nincs `priceNum`, de van `minNightsNum`, akkor a szobatipus `base_price` erteket hasznaljuk arnak, es letrehozzuk a rule-t a megadott min_nights ertekkel
3. **Kapacitas**: ez mar helyesen mukodik kulon is

### Technikai reszletek

A `saveBulk` fuggvenyben a 304-333. sorok kozt a kovetkezo logikai valtozas szukseges:

**Jelenlegi logika** (318. sor):
```typescript
} else if (priceNum) {
  // insert new rule -- ONLY if price is given
}
```

**Javitott logika**:
```typescript
} else {
  // insert new rule -- use base_price if no price given
  const effectivePrice = priceNum || roomType.base_price;
  // create rule with effectivePrice and minNightsNum
}
```

Ez biztositja, hogy:
- Ha csak arat adunk meg: letrejon a rule az arral es min_nights=1 alapertekkel
- Ha csak min. napokat adunk meg: letrejon a rule a szobatipus alaparaval es a megadott min_nights-szal
- Ha mindkettot megadjuk: mindketto a megadott ertek lesz

### Modositando fajl

| Fajl | Modositas |
|---|---|
| `src/pages/admin/AdminPricing.tsx` | `saveBulk` fuggveny: uj rule letrehozasa alaparral, ha csak min_nights van megadva |

