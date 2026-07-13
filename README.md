# TrueDesire

**Wahre Wünsche. Ehrliche Antworten.**

Privacy-first „Fragen-Spiel“ für Paare:

- Zwei Geräte beantworten dieselben Fragen (Ja/Nein/Vielleicht)
- Ende-zu-Ende verschlüsselte Speicherung (Server sieht nur Ciphertext)
- Pairing via Pairing-Code + Annahme (Multi-Pairing, ohne QR)
- Auswertung: nur Optionen ohne „Nein“ werden als Match gezeigt
- Wochenlimit pro Pair (nur aktiv, wenn beide zustimmen)

## Start (Dev)

Voraussetzungen: Node.js `>= 24`.

1. Server (Node.js + TypeScript, eigenes `server/package.json`)

```bash
npm ci --prefix server
npm run server:build
npm run server:start
```

- Server läuft standardmäßig auf `http://localhost:3001`
- Die API liegt unter `/api` (z.B. `/api/auth/register`); `/health` bleibt separat für Healthchecks.
- Persistenz: Postgres über `DATABASE_URL`

2. Client (Vite)

```bash
npm install
npm run dev
```

Für lokale Entwicklung ohne Same-Origin-Backend `VITE_API_BASE` setzen (z.B. `.env.local`):

```bash
VITE_API_BASE=http://localhost:3001
```

## Start mit Docker Compose (lokale Entwicklung)

Der Dev-Stack startet Backend und Frontend in Containern mit Watch-Modus:

```bash
npm run dev:docker
```

Alternativ direkt mit Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Danach sind die Dienste erreichbar unter:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Der Frontend-Container setzt `VITE_API_BASE=http://localhost:3001`. Der Backend-Container läuft mit `LOG_LEVEL=debug` und `REQUEST_LOGS=true`, sodass Requests und Pairing-Diagnose im Container-Log sichtbar sind.

Nützliche Befehle:

```bash
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml down
```

Hinweise:

- Die Container verwenden eigene Named Volumes für `node_modules`, damit Host- und Container-Abhängigkeiten getrennt bleiben.
- Die Dev-Datenbank liegt im Named Volume `postgres_dev_data` und bleibt nach Backend-Neustarts erhalten.
- Dev-Daten zurücksetzen: `docker compose -f docker-compose.dev.yml down -v`.
- Der Backend-Service mountet nur `./server` und nutzt ausschließlich `server/package.json`.
- Der Backend-Service baut `server/src` initial nach `server/dist` und startet zusätzlich TypeScript-Watch plus `node --watch`.
- App-Daten werden nicht mehr in `server/data/db.json` geschrieben.

## Qualität und CI

Lokale Checks, analog zur GitHub-PR-Pipeline:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run server:lint
npm run server:typecheck
npm run server:build
npm run test:e2e
```

Formatierung und Lint-Fixes:

```bash
npm run format
npm run lint:fix
```

### E2E UI Tests

Die E2E-Tests laufen gegen einen separaten, production-nahen Docker-Stack. Dadurch kollidieren sie nicht mit den Dev-Ports (`5173`/`3001`). Die E2E-Datenbank liegt auf `tmpfs` und startet pro Stack-Lauf leer.

Headless im Docker-Runner:

```bash
npm run test:e2e:docker
```

Playwright UI im Docker-Runner starten:

```bash
npm run test:e2e:docker:ui
```

Danach die Playwright-Test-UI öffnen:

```text
http://localhost:9323
```

Die getestete E2E-App ist parallel erreichbar unter:

```text
http://localhost:3101
```

Wenn sich Playwright lokal selbst mit UI-Fenster öffnen soll, zuerst nur die E2E-App starten:

```bash
docker compose -f docker-compose.e2e.yml up --build app-e2e
```

Dann in einem zweiten Terminal die lokale Playwright UI starten:

```bash
npm run test:e2e -- --ui
```

Aufräumen/Stoppen:

```bash
docker compose -f docker-compose.e2e.yml down
```

GitHub Actions:

- Pull Requests gegen `master`: Prettier, ESLint, Typecheck, Build und Playwright-E2E.
- Push auf `master`: gleiche Checks, Production-Docker-Image bauen, `/health` Smoke-Test, Push nach DockerHub.
- DockerHub Secrets: `DOCKERHUB_USERNAME` und `DOCKERHUB_TOKEN`.
- Image: `beberhardt/truedesire:latest` und `beberhardt/truedesire:<package.json version>`.

## Production mit Docker Compose

Production läuft als Single-App-Container: Das Node-Backend liefert API und gebaute Vite-Dateien unter derselben Origin aus.

```bash
cp release/.env.example release/.env
# release/.env prüfen/anpassen
docker compose -f release/docker-compose.prod.yml up -d --build
```

Der Stack veröffentlicht standardmäßig Port `3001`. Persistente Daten liegen im Docker Volume `truedesire_postgres_data`.

Ein bestimmtes DockerHub-Image starten:

```bash
TRUEDESIRE_TAG=0.1.0 docker compose -f release/docker-compose.prod.yml up -d

```

Image lokal bauen und pushen

```
npm run docker:prod:build
docker tag beberhardt/truedesire:local beberhardt/truedesire:latest
docker push beberhardt/truedesire:latest
```

## UI/Flow (MVP)

1. **Account**
   - Nickname setzen → Account erstellen/laden
   - Backup exportieren / importieren (Copy/Paste JSON)
   - Account löschen (lokal + serverseitig als gelöscht markieren)

2. **Pairing (Multi-Pairing)**
   - Du hast einen **Pairing-Code** (öffentlich für alle, die ihn kennen)
   - Eine Person gibt den Code des Partners ein, der Partner nimmt die Anfrage an
   - Offene Pairing-Anfragen werden angezeigt und können angenommen/abgelehnt/abgebrochen werden

3. **Fragen (nur eigene)**
   - Eigene Fragen hinzufügen
   - Beim Speichern wählst du deine eigene Antwort (Ja/Vielleicht/Nein), damit du nicht extra später antworten musst
   - Eigene Fragen kannst du löschen, solange dein Partner noch nicht geantwortet hat

4. **Spielen**
   - Karten-Ansicht (Vorige/Nächste)
   - Es werden nur Fragen angezeigt, die noch nicht von beiden beantwortet wurden
   - Wenn das Wochenlimit erreicht ist, werden keine neuen Partner-/Computer-Fragen mehr angezeigt
   - Button **„Bereits gespielte Fragen“**: zeigt Fragen, die du schon beantwortet hast, solange dein Partner noch nicht geantwortet hat (Antwort anpassen möglich)

5. **Auswertung (Matches)**
   - Nur Matches werden angezeigt: sobald beide geantwortet haben und keiner „Nein“ gesagt hat

6. **Wochenlimit**
   - Ein Partner schlägt ein Limit vor, der andere kann **annehmen** oder **ablehnen**

## System-Fragen (Computer)

Die „Computer“-Fragen liegen versioniert in Postgres und können über die API abgefragt werden:

- `GET /system/questions`

Die Kataloge liegen als versionierte JSON-Dateien unter `server/data/system-question-catalogs`
(`v1.json`, `v2.json`, ...). Beim Serverstart synchronisiert der Server fehlende Katalogversionen
idempotent nach Postgres und berechnet die SHA-256-Hashes intern. Bereits vorhandene Versionen
werden nicht verändert.

Neue Kataloge werden als vollständige neue Version angelegt. Alternativ kann ein Katalog explizit
veröffentlicht werden, z.B. nach dem Server-Build:

```bash
npm --prefix server run system-questions:publish -- server/data/system-question-catalogs/v2.json
```

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
