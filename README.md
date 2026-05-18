# love.interests

Privacy-first „Fragen-Spiel“ für Paare:

- Zwei Geräte beantworten dieselben Fragen (Ja/Nein/Vielleicht)
- Ende-zu-Ende verschlüsselte Speicherung (Server sieht nur Ciphertext)
- Pairing via gegenseitigem Pairing-Code + Double-Accept (Multi-Pairing, ohne QR)
- Auswertung: nur Optionen ohne „Nein“ werden als Match gezeigt
- Wochenlimit pro Pair (nur aktiv, wenn beide zustimmen)

## Start (Dev)

Voraussetzungen: Node.js `>= 24`.

1) Server (Node.js + TypeScript, Datei-Persistenz, keine externen Runtime-Dependencies)

```bash
npm run server:build
npm run server:start
```

- Server läuft standardmäßig auf `http://localhost:3001`
- Persistenz: `server/data/db.json`

2) Client (Vite)

```bash
npm install
npm run dev
```

Optional `VITE_API_BASE` setzen (z.B. `.env.local`):

```bash
VITE_API_BASE=http://localhost:3001
```

## UI/Flow (MVP)

Oben im Header kannst du zwischen **Version 1** und **Version 2** umschalten.

1) **Account**
   - Nickname setzen → Account erstellen/laden
   - Backup exportieren / importieren (Copy/Paste JSON)
   - Account löschen (lokal + serverseitig als gelöscht markieren)

2) **Pairing (Multi-Pairing)**
   - Du hast einen **Pairing-Code** (öffentlich für alle, die ihn kennen)
   - Beide Partner geben gegenseitig den Code des anderen ein und bestätigen
   - Offene Pairing-Anfragen werden angezeigt und können angenommen/abgelehnt/abgebrochen werden

3) **Fragen (nur eigene)**
   - Eigene Fragen hinzufügen
   - Beim Speichern wählst du deine eigene Antwort (Ja/Vielleicht/Nein), damit du nicht extra später antworten musst
   - Eigene Fragen kannst du löschen, solange dein Partner noch nicht geantwortet hat

4) **Spielen**
   - Karten-Ansicht (Vorige/Nächste)
   - Es werden nur Fragen angezeigt, die noch nicht von beiden beantwortet wurden
   - Wenn das Wochenlimit erreicht ist, werden keine neuen Partner-/Computer-Fragen mehr angezeigt
   - Button **„Bereits gespielte Fragen“**: zeigt Fragen, die du schon beantwortet hast, solange dein Partner noch nicht geantwortet hat (Antwort anpassen möglich)

5) **Auswertung (Matches)**
   - Nur Matches werden angezeigt: sobald beide geantwortet haben und keiner „Nein“ gesagt hat

6) **Wochenlimit**
   - Ein Partner schlägt ein Limit vor, der andere kann **annehmen** oder **ablehnen**

## System-Fragen (Computer)

Die initialen „Computer“-Fragen liegen editierbar in `server/data/system-questions.json` und können über die API abgefragt werden:

- `GET /system/questions`

Wichtig: System-Fragen werden **nachdem ein Pair aktiv ist** von einem Client **clientseitig verschlüsselt** und dann einmalig dem Pair hinzugefügt. In der Datenbank liegen sie nur als Ciphertext.

Integrität: Der Server kann den Klartext nicht prüfen (Zero-Knowledge). Stattdessen enthält der verschlüsselte Payload `systemId` + `systemHash` (SHA‑256). Der Client verifiziert diese gegen `GET /system/questions` und markiert Abweichungen als „nicht verifiziert“.

## Sicherheit (Kurzüberblick)

- **API-Auth:** Alle API-Requests (außer `/health` und `/auth/register`) sind signiert (ECDSA P‑256). Der Server akzeptiert nur Requests mit gültiger Signatur für die gespeicherte `signPublicJwk` des Users.
- **E2E Inhalte:** Fragen/Antworten sind AES‑GCM verschlüsselt. Key-Derivation: ECDH (P‑256) + HKDF‑SHA256 (browser-native WebCrypto).
- **Replay-Schutz:** `x-nonce` + Zeitfenster.
- **Backup/Restore:** Private Keys bleiben auf dem Gerät (IndexedDB). Export/Import ist im UI verfügbar.

## Limits

- **Fragen hinzufügen:** unbegrenzt.
- **Antworten pro Woche:** serverseitig limitiert über das vereinbarte Wochenlimit.
  - Der Limit-Zähler gilt nur für Antworten auf Fragen, die **nicht von dir** erstellt wurden (Partner/Computer).
  - **Eigene Fragen** kannst du immer beantworten – auch wenn das Wochenlimit erreicht ist.
  - **Änderungen** an bereits gespeicherten Antworten sind möglich, solange dein Partner noch nicht geantwortet hat.
  - Sobald beide geantwortet haben, sperrt die API Änderungen.

## Troubleshooting

- Pairing: beide Seiten müssen gegenseitig anfragen **und** akzeptieren, erst dann ist ein Pair `active`.