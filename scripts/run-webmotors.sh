#!/bin/sh
set -eu

# cron não herda o env do Docker; o entrypoint o persiste em .cron-env.
# Em `docker compose run/exec` o env já vem do Docker e o arquivo pode não existir.
if [ -f /app/.cron-env ]; then
  . /app/.cron-env
fi

cd /app
echo "[$(date -Iseconds)] Executando monitor Webmotors..."
node dist/webmotors/index.js
