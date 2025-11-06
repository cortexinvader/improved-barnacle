# Multi-stage Dockerfile for improved-barnacle
# - Builds the client (Vite) and bundles the server (esbuild) via the repo's "build" script.
# - Copies built artifacts, node_modules and required config files into a runtime image.
# - Entrypoint creates a drizzle.config.json from DATABASE_URL (if provided), runs migrations (optional),
#   then starts the server (node dist/index.js).
#
# This Dockerfile addresses the runtime errors you hit:
# - creates a drizzle.config.json at container start so drizzle-kit push can run,
# - includes config.json and shared schema so the app can read config and migrations can reference schema.ts,
# - patches server/vite.ts at build time to serve the correct dist/public path in production.
#
FROM node:20-alpine AS build
WORKDIR /app

# Tools needed to build some deps and run scripts
RUN apk add --no-cache python3 make g++ bash ca-certificates

# Copy package manifests for better caching
COPY package.json package-lock.json ./

# Install all deps (dev + prod) so build tools (vite, esbuild, drizzle-kit) are available
RUN npm ci

# Copy full repo
COPY . .

# Patch server/vite.ts at build time so production uses ../dist/public as the static folder
# (fixes "Could not find the build directory" runtime error)
RUN sed -i 's|path.resolve(import.meta.dirname, \"public\")|path.resolve(import.meta.dirname, \"..\", \"dist\", \"public\")|g' server/vite.ts || true

# Build client and bundle server (uses package.json "build" script)
RUN npm run build

############################
# Runtime image
############################
FROM node:20-alpine AS runtime
WORKDIR /app

# Small runtime extras
RUN apk add --no-cache bash ca-certificates

# Copy built artifacts and full node_modules from build stage.
# We copy full node_modules so drizzle-kit (dev tool) is available in the runtime for migrations.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Copy config.json, shared schema, data directory, uploads etc so runtime has files the app expects.
COPY --from=build /app/config.json ./config.json
COPY --from=build /app/shared ./shared
COPY --from=build /app/data ./data
COPY --from=build /app/uploads ./uploads

# Copy package manifests (kept for clarity/debugging)
COPY package.json package-lock.json ./

# Create an entrypoint that will:
#  - create drizzle.config.json dynamically from DATABASE_URL (if provided),
#  - run migrations via `npm run db:push` (drizzle-kit),
#  - then start the server: node dist/index.js
RUN mkdir -p /usr/local/bin
RUN cat > /usr/local/bin/docker-entrypoint.sh <<'SH'
#!/usr/bin/env sh
set -e

echo "==> Container start: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# If DATABASE_URL provided, create drizzle.config.json for drizzle-kit and attempt migrations.
if [ -n "${DATABASE_URL}" ]; then
  echo "==> DATABASE_URL detected, creating drizzle.config.json..."
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
  # Run migrations; if they fail we continue to start server but we log the failure.
  # Change to `exit 1` here if you prefer the container to fail on migration errors.
  if npm run db:push; then
    echo "==> Migrations ran successfully."
  else
    echo "==> Migrations failed or drizzle-kit is not configured; continuing to start server."
  fi
else
  echo "==> No DATABASE_URL found; skipping migrations."
fi

# Ensure config.json exists and is readable; warn if missing (server will also error if missing).
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
