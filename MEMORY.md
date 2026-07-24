## GOTCHA

- Symptom: `otter` exits with `ECONNREFUSED 127.0.0.1:55432` under plain `docker compose`. Cause: `compose.yml` expects an external database, and container loopback points to the app container itself. Fix: use `docker compose -f compose.dev.yml up --build` for bundled development Postgres, or provide a container-reachable production database hostname.
- Symptom: server-rendering generated shadcn TSX in Node tests can fail with `React is not defined`. Cause: the Node `tsx` test loader uses the classic JSX runtime for those dependency modules. Fix: keep an explicit non-type React runtime binding in generated shadcn components used by server-rendered tests.

## TASTE
