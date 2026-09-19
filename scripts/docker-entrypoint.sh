#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required when DATABASE_URL is not set}"
  DATABASE_URL="$(node --input-type=module -e '
    const url = new URL("postgres://otter@postgres:5432/otter_dev");
    url.password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
    process.stdout.write(url.href);
  ')"
  export DATABASE_URL
fi

exec "$@"
