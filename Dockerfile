# Multi-stage Dockerfile for improved-barnacle (fixed: no raw shell outside RUN)
FROM node:20-alpine AS build
WORKDIR /app

# Tools needed to build some deps and run scripts
RUN apk add --no-cache python3 make g++ bash ca-certificates

# Copy package manifests for caching
COPY package.json package-lock.json ./

# Install all deps (dev + prod) so build tools available
RUN npm ci

# Copy source
COPY . .

# Patch server/vite.ts so production uses ../dist/public
RUN sed -i 's|path.resolve(import.meta.dirname, \"public\")|path.resolve(import.meta.dirname, \"..\", \"dist\", \"public\")|g' server/vite.ts || true

# Build client and bundle server
RUN npm run build

############################
# Runtime image
############################
FROM node:20-alpine AS runtime
WORKDIR /app

# Small runtime extras
RUN apk add --no-cache bash ca-certificates

# Copy built artifacts and node_modules from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Copy repo defaults (config.json, shared, data, uploads). These can be overwritten at runtime by the entrypoint.
COPY --from=build /app/config.json ./config.json
COPY --from=build /app/shared ./shared
COPY --from=build /app/data ./data
COPY --from=build /app/uploads ./uploads

COPY package.json package-lock.json ./

# Create entrypoint script (all shell logic goes here)
RUN mkdir -p /usr/local/bin
RUN cat > /usr/local/bin/docker-entrypoint.sh <<'SH'
#!/usr/bin/env sh
set -e

echo "==> Container start: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Ensure data dir exists
mkdir -p /app/data

# 1) BACKUP: prefer raw JSON from BACKUP env var, else copy file from BACKUP_FILE
if [ -n "${BACKUP}" ]; then
  echo "==> Writing admin backup from BACKUP env var to /app/data/admin_backup.json"
  printf "%s" "${BACKUP}" > /app/data/admin_backup.json
elif [ -n "${BACKUP_FILE}" ] && [ -f "${BACKUP_FILE}" ]; then
  echo "==> Copying admin backup from BACKUP_FILE (${BACKUP_FILE}) to /app/data/admin_backup.json"
  cp "${BACKUP_FILE}" /app/data/admin_backup.json
else
  echo "==> No admin backup provided via BACKUP or BACKUP_FILE; using /app/data/admin_backup.json from image (if present)"
fi

# Optional: warn when config.json missing (app will also error if it's required)
if [ ! -f /app/config.json ]; then
  echo "WARNING: config.json not found at /app/config.json. The app expects this file."
fi

# 2) If DATABASE_URL provided, create drizzle.config.json and run migrations
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
CMD ["/usr/local/bin/docker-entrypoint.sh"]
