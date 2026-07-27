# TrueDesire

![truedesire](docs/true-desire-small.png)

**Wahre Wünsche. Ehrliche Antworten.**

Privacy-first „Fragen-Spiel“ für Paare:

- Zwei Geräte beantworten dieselben Fragen (Ja/Nein/Vielleicht)
- Ende-zu-Ende verschlüsselte Speicherung (Server sieht nur Ciphertext)
- Pairing via Pairing-Code + Annahme (Multi-Pairing, ohne QR)
- Auswertung: nur Optionen ohne „Nein“ werden als Match gezeigt
- Wochenlimit pro Pair (nur aktiv, wenn beide zustimmen)

Weitere Liebesspiele gibt es auf: https://love-games.app/

## Regeln und Ablauf

TrueDesire ist ein privates Frage- und Matching-Spiel für zwei Personen oder mehrere einzelne
Paare, die auf spannende Weise herausbekommen wollen, was sich beide schon immer gewünscht haben.

Ziel ist es auf voreingestellte aber auch eigene Fragen per "Ja/Nein/Vielleicht" 💌 zu antworten.
Wenn beide einer Meinung sind oder sich darauf einlassen wollen, gibt es ein Match, und das Paar
kann über die gemeinsame Umsetzung nachdenken.

### 1. Konto erstellen 🔐

Jede Person erstellt ein eigenes Konto mit Nickname. Die privaten Schlüssel bleiben auf dem Gerät.
Lege direkt ein Backup an, damit du dein Konto später auf demselben oder einem neuen Gerät
wiederherstellen kannst.

### 2. Pairing herstellen 🤝

Jedes Konto hat einen Pairing-Code. Eine Person gibt den Code der anderen Person ein und sendet eine
Verknüpfungsanfrage. Die andere Person kann diese Anfrage annehmen oder ablehnen. Erst nach der
Annahme entsteht ein aktives Pair.

### 3. Fragen beantworten 🎴

Ihr beantwortet dieselben Fragen unabhängig voneinander mit:

- **Ja**: Das möchtest du.
- **Vielleicht**: Du bist offen oder neugierig.
- **Nein**: Das möchtest du nicht.

Du kannst eigene Fragen hinzufügen. Beim Speichern beantwortest du deine eigene Frage direkt mit,
damit sie für das Pair spielbar ist.

### 4. Matches sehen ✨

Ein Ergebnis wird erst angezeigt, wenn beide Personen dieselbe Frage beantwortet haben. Sichtbar
werden nur Matches, bei denen niemand **Nein** gesagt hat:

- **Ja + Ja**: klares Match.
- **Ja + Vielleicht** oder **Vielleicht + Ja**: vorsichtiges Match.
- **Vielleicht + Vielleicht**: beide sind neugierig.
- Sobald mindestens eine Person **Nein** wählt, bleibt die Antwort verborgen.

### 5. Antworten ändern und Grenzen respektieren 🧭

Du kannst deine Antwort ändern, solange dein Partner dieselbe Frage noch nicht beantwortet hat.
Sobald beide geantwortet haben, ist die Frage abgeschlossen. Das Wochenlimit begrenzt neue Antworten,
sodass auch noch nach einigen Wochen die Spannung nach neuen Matches aussteht.

## Nutzung

### Hosted

Kostenlos nutzbare Version gehostet unter: [https://truedesire.love-games.app/](https://truedesire.love-games.app/).


### Docker compose


Via Docker Compose:

```yaml
name: truedesire

services:
  app:
    image: beberhardt/truedesire:latest
    restart: unless-stopped
    environment:
      # Runtime
      NODE_ENV: production
      PORT: ${PORT:-3001}
      STATIC_DIR: /app/dist

      # Datenbank
      DATABASE_URL: postgresql://${POSTGRES_USER:-truedesire}:${POSTGRES_PASSWORD:-change-me}@db:5432/${POSTGRES_DB:-truedesire}
      DB_SSL: ${DB_SSL:-false}
      DB_MIGRATIONS_LOCK_TIMEOUT_MS: ${DB_MIGRATIONS_LOCK_TIMEOUT_MS:-10000}

      # Logging
      LOG_LEVEL: ${LOG_LEVEL:-info}
      REQUEST_LOGS: ${REQUEST_LOGS:-true}

      # Spielregeln
      WEEKLY_LIMIT_DEFAULT: ${WEEKLY_LIMIT_DEFAULT:-7}

      # Pairing-Rate-Limits
      PAIRING_LIMIT_USER_PER_MIN: ${PAIRING_LIMIT_USER_PER_MIN:-10}
      PAIRING_LIMIT_USER_PER_HOUR: ${PAIRING_LIMIT_USER_PER_HOUR:-50}
      PAIRING_LIMIT_IP_PER_MIN: ${PAIRING_LIMIT_IP_PER_MIN:-30}
      PAIRING_LIMIT_IP_PER_HOUR: ${PAIRING_LIMIT_IP_PER_HOUR:-200}
    ports:
      - "${PUBLISHED_PORT:-3001}:${PORT:-3001}"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'node -e "fetch(''http://127.0.0.1:'' + process.env.PORT + ''/health'').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"'
        ]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 10s

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-truedesire}
      POSTGRES_USER: ${POSTGRES_USER:-truedesire}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change-me}
    volumes:
      - truedesire_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:
        ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-truedesire} -d ${POSTGRES_DB:-truedesire}"]
      interval: 10s
      timeout: 5s
      retries: 10

volumes:
  truedesire_postgres_data:
```

## Entwickler

Mehr Informationen für Entwickler gibt es [hier](DEV.md).
