
## "SEGÍTHETEK?" felirat javítása mobilon

### Probléma

A 110px átmérőjű kerek gombon belül a „SEGÍTHETEK?" felirat nem fér el, mert:
- A betűméret még 9px-nél is túl széles a szöveg a `letter-spacing: 0.08em` értékkel
- A szöveg kilóg a kör szélén

### Megoldás

A `src/components/VapiButton.tsx` fájlban a mobilos media query-ben az alábbi módosításokat végezzük:

**Jelenlegi mobilos CSS:**
```css
.vapi-btn .vapi-label { font-size: 9px; padding-bottom: 8px; letter-spacing: 0.08em; }
```

**Új mobilos CSS:**
```css
.vapi-btn .vapi-label { font-size: 7px; padding-bottom: 6px; letter-spacing: 0.04em; white-space: nowrap; }
```

### Változások részletesen

| Tulajdonság | Előtte | Utána |
|---|---|---|
| `font-size` | 9px | 7px |
| `letter-spacing` | 0.08em | 0.04em |
| `padding-bottom` | 8px | 6px |
| `white-space` | (nincs) | nowrap |

### Módosítandó fájl

| Fájl | Módosítás |
|---|---|
| `src/components/VapiButton.tsx` | Mobilos label CSS finomhangolása |
