#!/bin/sh
# Bootstrap and run PocketBase. Idempotent: safe to run on every container
# start because the pb_data directory is a persistent volume.
set -e

PB_DIR=/pb/pb_data
MIGRATIONS_DIR=/pb/pb_migrations

# Explicitly apply app migrations
pocketbase migrate up --dir "$PB_DIR" --migrationsDir "$MIGRATIONS_DIR"

# Ensure a superuser exists (PocketBase will not start fully without one).
# `upsert` creates or updates, so this is safe to repeat.
if [ -n "$POCKETBASE_SUPERUSER_EMAIL" ] && [ -n "$POCKETBASE_SUPERUSER_PASSWORD" ]; then
  pocketbase superuser upsert "$POCKETBASE_SUPERUSER_EMAIL" "$POCKETBASE_SUPERUSER_PASSWORD" --dir "$PB_DIR"
else
  echo "WARNING: POCKETBASE_SUPERUSER_EMAIL / POCKETBASE_SUPERUSER_PASSWORD not set; skipping superuser bootstrap." >&2
fi

exec pocketbase serve --http 0.0.0.0:8090 --dir "$PB_DIR" --migrationsDir "$MIGRATIONS_DIR"
