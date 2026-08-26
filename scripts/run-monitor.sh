#!/bin/sh
set -eu

cd /app
echo "[$(date -Iseconds)] Executando monitor Nitro (pneus)..."
node dist/nitro/index.js
