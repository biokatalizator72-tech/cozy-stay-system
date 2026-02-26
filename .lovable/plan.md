

## Vapi API kulcs javítása és kapcsolat ellenőrzése

### 1. API kulcs javítása
A `src/components/VapiButton.tsx` fájlban a `VAPI_PUBLIC_KEY` konstans értékét módosítjuk:
- **Jelenlegi**: `5181a96c-e84b-4306-a267-1c0e97f20139`
- **Új**: `pk-5181a96c-e84b-4306-a267-1c0e97f20139`

### 2. Kapcsolat ellenőrzése
A módosítás után a böngésző automatizációval ellenőrizzük:
- Megnyitjuk az előnézetet
- Rákattintunk a Vapi gombra
- Megnézzük a konzol logokat és hálózati kéréseket, hogy a Vapi SDK sikeresen csatlakozik-e

### Módosítandó fájl

| Fájl | Módosítás |
|---|---|
| `src/components/VapiButton.tsx` | `VAPI_PUBLIC_KEY` frissítése `pk-` prefixszel |

