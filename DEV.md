# Entwicklung

## Schnellstart

Empfohlen ist der Docker-Dev-Stack. Er startet Postgres, Backend und Frontend mit Watch-Modus:

```bash
npm run dev:docker
```

Aufrufbar im Browser:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Healthcheck: `http://localhost:3001/health`
- API: `http://localhost:3001/api/...`

Nützliche Docker-Befehle:

```bash
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml down -v
```

`down -v` löscht auch die lokale Dev-Datenbank im Volume `postgres_dev_data`.

## Lokal Ohne Docker

Voraussetzung: Node.js `>= 24` und eine laufende Postgres-Datenbank.

Backend:

```bash
npm ci --prefix server
npm run server:build
npm run server:start
```

Frontend:

```bash
npm install
npm run dev
```

Für getrennte lokale Frontend-/Backend-Ports:

```bash
VITE_API_BASE=http://localhost:3001
```

## Checks

Häufig genutzte Checks:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

Backend separat:

```bash
npm run server:lint
npm run server:typecheck
npm run server:test
npm run server:build
```

Alles zusammen:

```bash
npm run check
```

Formatierung:

```bash
npm run format:check
npm run format
```

## E2E Tests

Headless im Docker-Runner:

```bash
npm run test:e2e:docker
```

Playwright UI im Docker-Runner:

```bash
npm run test:e2e:docker:ui
```

Aufrufbar im Browser:

- Playwright UI: `http://localhost:9323`
- E2E-App: `http://localhost:3101`

Aufräumen:

```bash
docker compose -f docker-compose.e2e.yml down
```

## Wichtige ENV

Im Docker-Dev-Stack sind die wichtigsten Werte bereits gesetzt.

- `DATABASE_URL`: Postgres-Verbindung für das Backend.
- `PORT`: Backend-Port, Standard `3001`.
- `VITE_API_BASE`: API-Basis-URL für lokale Frontend-Entwicklung.
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` oder `silent`.
- `REQUEST_LOGS`: Request-Logs aktivieren oder deaktivieren.
- `WEEKLY_LIMIT_DEFAULT`: Standard-Wochenlimit für neue Pairs.
- `PAIRING_LIMIT_USER_PER_MIN`, `PAIRING_LIMIT_USER_PER_HOUR`: Pairing-Limits pro User.
- `PAIRING_LIMIT_IP_PER_MIN`, `PAIRING_LIMIT_IP_PER_HOUR`: Pairing-Limits pro IP.

Die Production-Vorlage liegt in `release/.env.example`.

## Systemfragen

Systemfragen liegen versioniert unter `server/data/system-question-catalogs`. Beim Serverstart werden
fehlende Katalogversionen nach Postgres synchronisiert.

Nach einem Server-Build kann ein Katalog manuell veröffentlicht werden:

```bash
npm --prefix server run system-questions:publish -- server/data/system-question-catalogs/v2.json
```
