#!/bin/sh
set -eu

cd /app

# cron não herda o env do Docker; persiste para os scripts dos jobs
{
  printenv | while IFS='=' read -r key value; do
    case "$key" in
      ""|HOME|HOSTNAME|PWD|OLDPWD|SHLVL|_) continue ;;
    esac
    case "$key" in
      *[!A-Za-z0-9_]*) continue ;;
    esac
    escaped=$(printf '%s' "$value" | sed "s/'/'\\\\''/g")
    printf "export %s='%s'\n" "$key" "$escaped"
  done
} > /app/.cron-env
chmod 600 /app/.cron-env

node dist/startup-notify.js

exec cron -f
