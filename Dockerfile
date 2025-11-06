# Multi-stage Dockerfile for improved-barnacle (updated to use short env names for backup)
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache python3 make g++ bash ca-certificates

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Patch server/vite.ts to serve dist/public in production
RUN sed -i 's|path.resolve(import.meta.dirname, \"public\")|path.resolve(import.meta.dirname, \"..\", \"dist\", \"public\")|g' server/vite.ts || true

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache bash ca-certificates

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Copy defaults (config.json already exists in repo)
COPY --from=build /app/config.json ./config.json
COPY --from=build /app/shared ./shared
COPY --from=build /app/data ./data
COPY --from=build /app/uploads ./uploads

COPY package.json package-lock.json ./

# Entrypoint: supports BACKUP (raw JSON text) or BACKUP_FILE (path to mounted secret file)
RUN mkdir -p /usr/local/bin
RUN cat > /usr/local/bin/docker-entrypoint.sh <<'SH'
#!/usr/bin/env sh
set -e

echo "==> Container start: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

mkdir -p /app/data

# Backup: prefer raw JSON in env var BACKUP, else file path in BACKUP_FILE
if [ -n "${BACKUP}" ]; then
  echo "==> Writing admin backup from BACKUP env var to /app/data/admin_backup.json"
  printf "%s" "${BACKUP}" > /app/data/admin_backup.json
elif [ -n "${BACKUP_FILE}" ] && [ -f "${BACKUP_FILE}" ]; then
  echo "==> Copying admin backup from BACKUP_FILE (${BACKUP_FILE}) to /app/data/admin_backup.json"
  cp "${BACKUP_FILE}" /app/data/admin_backup.json
else
  echo "==> No admin backup provided via BACKUP or BACKUP_FILE; using /app/data/admin_backup.json from image (if present)"
fi

# If DATABASE_URL provided, create drizzle.config.json and run migrations
if [ -n "${DATABASE_URL}" ]; then
  echo "==> DATABASE_URL detected, creating /app/drizzle.config.json..."
  cat > /app/drizzle.config.json <<JSON
{
  "out": "./migrations",
  "schema": "./shared/schema.ts",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "${DATABASE_URL}"
  }
}
JSON

  echo "==> Running migrations (npm run db:push)..."
  if npm run db:push; then
    echo "==> Migrations ran successfully."
  else
    echo "==> Migrations failed or drizzle-kit is not configured; continuing to start server."
  fi
else
  echo "==> No DATABASE_URL found; skipping migrations."
fi

echo "==> Starting server: node dist/index.js"
exec node dist/index.js
SH
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 5000
CMD ["/usr/local/bin/docker-entrypoint.sh"]# Ensure config.json exists and is readable; warn if missing (server will also error if missing).
if [ ! -f /app/config.json ]; then
  echo "WARNING: config.json not found at /app/config.json. The app expects this file."
fi

echo "==> Starting server: node dist/index.js"
exec node dist/index.js
SH

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Default to production. Render will still set NODE_ENV or PORT env vars as needed.
ENV NODE_ENV=production

# Useful for local runs; Render ignores EXPOSE
EXPOSE 5000

# Start the entrypoint
CMD ["/usr/local/bin/docker-entrypoint.sh"]
