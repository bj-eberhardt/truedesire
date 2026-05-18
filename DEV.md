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
