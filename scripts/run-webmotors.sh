#!/bin/sh
set -eu

cd /app
echo "[$(date -Iseconds)] Executando monitor Webmotors..."
node dist/webmotors/index.js
