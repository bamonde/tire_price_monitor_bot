#!/bin/sh
set -eu

. /app/.cron-env

cd /app
echo "[$(date -Iseconds)] Executando monitor Webmotors..."
node dist/webmotors/index.js
