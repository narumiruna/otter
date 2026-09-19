## GOTCHA

- `compose.yaml` defaults to the development app and bundled Postgres. Start the production-like app explicitly with `docker compose --profile production up otter` and provide a container-reachable `DATABASE_URL`; container loopback does not reach a database on the host.

## TASTE
