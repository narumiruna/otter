## GOTCHA

- Symptom: `otter` exits with `ECONNREFUSED 127.0.0.1:55432` under plain `docker compose`. Cause: `compose.yaml` expects an external database, and container loopback points to the app container itself. Fix: use `docker compose -f compose.dev.yaml up --build` for bundled development Postgres, or provide a container-reachable production database hostname.

## TASTE
