
## Vapi lebegő asszisztens gomb hozzáadása

### Összefoglalás

Egy kerek, 250px átmérőjű lebegő gombot adunk a jobb alsó sarokba, amelynek háttere az "Eszter" asszisztens képe. A gomb megnyomásakor elindul a Vapi hangasszisztens.

### Megvalósítás lépései

**1. Vapi script hozzáadása (`index.html`)**

A Vapi SDK script-et a `<body>` végéhez adjuk hozzá CDN-ről:
```html
<script src="https://cdn.vapi.ai/vapi-web-sdk.js"></script>
```

**2. Új komponens: `VapiButton` (`src/components/VapiButton.tsx`)**

Egy önálló React komponenst hozunk létre a gombhoz:
- **Stílus**: `fixed`, jobb alsó sarok (`bottom-6 right-6`), `z-50`
- **Méret**: 250px × 250px, `border-radius: 50%` (tökéletes kör)
- **Háttér**: `https://siralyhotel.hu/wp-content/uploads/2026/02/eszter1.png` kép, `object-cover` módban
- **"SEGÍTHETEK?" sáv**: A gomb alján félkör alakú sötétített sáv (félig átlátszó fekete overlay), fehér félkövér felirattal
- **Kattintásra**: `window.vapiSDK.start()` hívása a megadott Public Key-jel és Assistant ID-val
- **TypeScript**: `window.vapiSDK` deklarálva globális típusként

**Vapi konfiguráció:**
- Public Key: `5181a96c-e84b-4306-a267-1c0e97f20139`
- Assistant ID: `1b89fb88-f113-475b-85ec-ef4facba0a62`

**3. Gomb beillesztése az `App.tsx`-be**

A `VapiButton` komponenst az `App.tsx`-be importáljuk és a `<BrowserRouter>` blokkon kívül, de a `<TooltipProvider>` belsejébe helyezzük – így minden oldalon megjelenik, beleértve a vendégoldalt és az admin felületet is.

### Vizuális megjelenés

```text
┌─────────────────────────────────────────┐
│                                         │
│   [Eszter képe – kerek, 250×250px]     │
│                                         │
│  ╔═══════════════════════════════════╗  │
│  ║        SEGÍTHETEK?               ║  │ ← sötétített sáv
│  ╚═══════════════════════════════════╝  │
└─────────────────────────────────────────┘
        (jobb alsó sarok, fixed)
```

### Módosítandó / létrehozandó fájlok

| Fájl | Módosítás |
|---|---|
| `index.html` | Vapi SDK script tag hozzáadása |
| `src/components/VapiButton.tsx` | Új komponens létrehozása |
| `src/App.tsx` | VapiButton importálása és beillesztése |
