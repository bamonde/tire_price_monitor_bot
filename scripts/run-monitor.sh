#!/bin/sh
set -eu

. /app/.cron-env

cd /app
echo "[$(date -Iseconds)] Executando monitor Nitro (pneus)..."
node dist/nitro/index.js
