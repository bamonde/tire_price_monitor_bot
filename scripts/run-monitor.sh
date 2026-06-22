#!/bin/sh
set -eu

cd /app
echo "[$(date -Iseconds)] Executando monitor de preços..."
node dist/index.js
