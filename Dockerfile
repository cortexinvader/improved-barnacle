# Multi-stage Dockerfile for improved-barnacle
# - Patches server/vite.ts so production serving points to dist/public (fixes "could not find build directory" error).
# - Installs dependencies and runs the repo build (vite + esbuild) in the build stage.
# - Copies built artifacts and full node_modules into the runtime image so drizzle-kit (dev dep) is available
#   and migrations can be run at container start.
# - Entrypoint optionally runs migrations (npm run db:push) if DATABASE_URL is set, then starts node dist/index.js.
#
# Notes:
# - The server expects the built client at dist/public (vite.config.ts sets outDir to dist/public).
# - This Dockerfile leaves migration optional at container start; you can enforce failure on migration error by
#   changing the entrypoint behavior.
# - For persistent uploads, switch file storage to an external object store (S3/R2). Render filesystem is ephemeral.
FROM node:20-alpine AS build
WORKDIR /app

# Install build tools used by some native deps (if needed)
RUN apk add --no-cache python3 make g++ bash ca-certificates

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (dev + prod) so build tools like vite, esbuild, drizzle-kit are available
RUN npm ci

# Copy the rest of the repository
COPY . .

# Patch server/vite.ts to serve dist/public in production (fix production static path).
# This replaces: path.resolve(import.meta.dirname, "public")
# with:              path.resolve(import.meta.dirname, "..", "dist", "public")
# Use sed -i which is available in alpine busybox.
RUN sed -i 's|path.resolve(import.meta.dirname, \"public\")|path.resolve(import.meta.dirname, \"..\", \"dist\", \"public\")|g' server/vite.ts || true

# Build the client (vite) and bundle the server (esbuild) via the project's build script
RUN npm run build

############################
# Runtime image
############################
FROM node:20-alpine AS runtime
WORKDIR /app

# Small runtime extras
RUN apk add --no-cache bash ca-certificates

# Copy built artifacts and node_modules from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Copy package manifests in case runtime needs them
COPY package.json package-lock.json ./

# Create an embedded entrypoint script inside the image (no separate file required)
RUN mkdir -p /usr/local/bin
RUN cat > /usr/local/bin/docker-entrypoint.sh <<'SH'
#!/usr/bin/env sh
set -e

echo "==> Container start: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# If DATABASE_URL is provided, attempt to run migrations.
if [ -n "${DATABASE_URL}" ]; then
  echo "==> DATABASE_URL detected, attempting to run migrations (npm run db:push)..."
  # npm run db:push uses drizzle-kit; node-postgres SSL options are controlled by server/db.ts via DB_SSL env.
  if npm run db:push; then
    echo "==> Migrations ran successfully."
  else
    # If migrations fail, continue to start the server but log the failure. You can change this to exit 1
    # if you prefer the container to fail on migration errors.
    echo "==> Migrations failed or are not configured; continuing to start server."
  fi
else
  echo "==> No DATABASE_URL found; skipping migrations."
fi

# Start the server (expects dist/index.js produced by esbuild)
echo "==> Starting server: node dist/index.js"
exec node dist/index.js
SH

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Default environment (can be overridden on Render)
ENV NODE_ENV=production

# Expose default port (useful locally). Render ignores EXPOSE.
EXPOSE 5000

# Entrypoint runs migrations if DB present, then starts the server
CMD ["/usr/local/bin/docker-entrypoint.sh"]
