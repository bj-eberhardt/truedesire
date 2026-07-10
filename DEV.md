# Development Configuration

This project supports simple runtime configuration for weekly limits and initial system questions.

## Weekly Limit (Default = 15)

- Server default weekly limit is controlled by environment variable:
  - `WEEKLY_LIMIT_DEFAULT`
- If not set, the fallback default is `15`.
- Applied when new pair links are created on the server.

Example:

```bash
WEEKLY_LIMIT_DEFAULT=20 npm run server:start
```

## Initial System Questions

- System questions are loaded by the server from a JSON file.
- Default file path:
  - `server/data/system-questions.json`
- You can override this path with:
  - `SYSTEM_QUESTIONS_FILE`

Example:

```bash
SYSTEM_QUESTIONS_FILE=/absolute/path/to/my-system-questions.json npm run server:start
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
- `DATA_DIR` (default: `server/data`)
- `STATIC_DIR` (wenn gesetzt, liefert das Backend die gebaute Vite-App aus)
- `WEEKLY_LIMIT_DEFAULT` (default: `15`)
- `SYSTEM_QUESTIONS_FILE` (default: `server/data/system-questions.json`)
- `PAIRING_LIMIT_USER_PER_MIN` (default: `10`)
- `PAIRING_LIMIT_USER_PER_HOUR` (default: `50`)
- `PAIRING_LIMIT_IP_PER_MIN` (default: `30`)
- `PAIRING_LIMIT_IP_PER_HOUR` (default: `200`)

Frontend-Build-ENV:

- `VITE_API_BASE`: optional. Wenn leer, nutzt der Browser `window.location.origin`.

Production-Docker-ENV:

- `TRUEDESIRE_TAG`: DockerHub-Tag für `beberhardt/truedesire`.

## API namespace and static serving

Production follows the Herzgarten pattern:

- `/health` is a public health endpoint.
- `/api/*` is handled as API traffic.
- All other `GET`/`HEAD` requests are served from `STATIC_DIR` with an SPA fallback to `index.html`.

The frontend API helper prefixes requests with `/api`, so same-origin production can leave `VITE_API_BASE` empty.
