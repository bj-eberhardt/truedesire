# Development Configuration

This project supports simple runtime configuration for weekly limits.

## Weekly Limit (Default = 15)

- Server default weekly limit is controlled by environment variable:
  - `WEEKLY_LIMIT_DEFAULT`
- If not set, the fallback default is `15`.
- Applied when new pair links are created on the server.

Example:

```bash
WEEKLY_LIMIT_DEFAULT=20 npm run server:start
```

## System Questions

- System questions are stored in Postgres.
- SQL migration `002_system_questions.sql` seeds catalog version `1` from the former
  `server/data/system-questions.json` contents.
- New catalogs are published as complete versions; no questions are inherited from previous
  versions.
- Startup migrations are SQL files in `server/src/db/migrations` and are copied to
  `server/dist/db/migrations` during `npm --prefix server run build`.

Example after building the server:

```bash
npm --prefix server run system-questions:publish -- /absolute/path/to/system-questions-v2.json
```

## Notes

- The client-side weekly limit input now defaults to `15` as well.
- Existing pairs keep their stored weekly limit unless changed via the weekly limit proposal flow.

## Pairing Rate Limits (`/pairing/request`)

To reduce partner-code brute-force attempts, the server enforces request limits on:

- authenticated user (`userId`)
- client IP address

Configurable env vars:

- `PAIRING_LIMIT_USER_PER_MIN` (default: `10`)
- `PAIRING_LIMIT_USER_PER_HOUR` (default: `50`)
- `PAIRING_LIMIT_IP_PER_MIN` (default: `30`)
- `PAIRING_LIMIT_IP_PER_HOUR` (default: `200`)

If exceeded, API returns:

- HTTP `429`
- error code: `rate_limited`

## Runtime ENV

Die vollständige Production-Vorlage liegt in `release/.env.example`.

Backend-ENV:

- `PORT` (default: `3001`)
- `LOG_LEVEL` (`debug`, `info`, `warn`, `error`, `silent`; default: `info`)
- `REQUEST_LOGS` (default: `true`)
- `DATABASE_URL` (default: `postgres://truedesire:truedesire@localhost:5432/truedesire`)
- `DB_SSL` (`true`/`false`; default: `false`)
- `DB_MIGRATIONS_LOCK_TIMEOUT_MS` (default: `10000`)
- `STATIC_DIR` (wenn gesetzt, liefert das Backend die gebaute Vite-App aus)
- `WEEKLY_LIMIT_DEFAULT` (default: `15`)
- `PAIRING_LIMIT_USER_PER_MIN` (default: `10`)
- `PAIRING_LIMIT_USER_PER_HOUR` (default: `50`)
- `PAIRING_LIMIT_IP_PER_MIN` (default: `30`)
- `PAIRING_LIMIT_IP_PER_HOUR` (default: `200`)

Frontend-Build-ENV:

- `VITE_API_BASE`: optional. Wenn leer, nutzt der Browser `window.location.origin`.

Production-Docker-ENV:

- `TRUEDESIRE_TAG`: DockerHub-Tag für `beberhardt/truedesire`.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: interne Postgres-Credentials.

## API namespace and static serving

Production follows the Herzgarten pattern:

- `/health` is a public health endpoint.
- `/api/*` is handled as API traffic.
- All other `GET`/`HEAD` requests are served from `STATIC_DIR` with an SPA fallback to `index.html`.

The frontend API helper prefixes requests with `/api`, so same-origin production can leave `VITE_API_BASE` empty.
