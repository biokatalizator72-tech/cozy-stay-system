

## Vapi gomb javítása -- helyes SDK integráció

### Probléma

A Vapi gomb nem indít hívást, mert:
1. A CDN script URL (`cdn.vapi.ai/vapi-web-sdk.js`) nem a hivatalos Vapi widget script
2. A `window.vapiSDK.start()` metódus nem létezik -- a helyes metódus a `window.vapiSDK.run()`

### Megoldás

Az npm csomag (`@vapi-ai/web`) használatára váltunk, ami megbízhatóbb és típusbiztos.

### Lépések

**1. `index.html`** -- Vapi CDN script eltávolítása
- Töröljük a `<script src="https://cdn.vapi.ai/vapi-web-sdk.js"></script>` sort, mivel az npm csomagot fogjuk használni

**2. `@vapi-ai/web` npm csomag telepítése**

**3. `src/components/VapiButton.tsx`** -- átírás az npm SDK-ra
- `import Vapi from '@vapi-ai/web'` használata
- A gombra kattintáskor `new Vapi(publicKey)` létrehozása, majd `.start(assistantId)` hívása
- A `window.vapiSDK` globális deklaráció eltávolítása
- Hibakezelés hozzáadása (`console.error` + felhasználói visszajelzés, ha nem sikerül)

### Technikai részletek

```tsx
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = "pk-5181a96c-e84b-4306-a267-1c0e97f20139";
const VAPI_ASSISTANT_ID = "1b89fb88-f113-475b-85ec-ef4facba0a62";

// Singleton instance
let vapiInstance: Vapi | null = null;

const getVapi = () => {
  if (!vapiInstance) {
    vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
  }
  return vapiInstance;
};

// A handleClick-ben:
const handleClick = () => {
  try {
    const vapi = getVapi();
    vapi.start(VAPI_ASSISTANT_ID);
  } catch (error) {
    console.error('Vapi hiba:', error);
  }
};
```

### Tesztelés

A Lovable előnézetben a Vapi szerverek nem elérhetők (sandbox korlátozás). A tesztelést a **publikált oldalon** kell végezni: `serene-booking-engine.lovable.app`

### Módosítandó fájlok

| Fájl | Módosítás |
|---|---|
| `index.html` | CDN script eltávolítása |
| `src/components/VapiButton.tsx` | Átírás `@vapi-ai/web` npm csomagra |

