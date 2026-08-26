#!/bin/sh
set -eu

cd /app

node dist/startup-notify.js

exec cron -f
