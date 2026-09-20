# @narumitw/otter-cli

Non-interactive CLI for managing trips, participants, expenses, balances, and settlement records in Otter.

## Install

After the package is published:

```bash
npm install --global @narumitw/otter-cli
otter --help
```

For local development from the repository root:

```bash
npm run build:cli
npm link --workspace @narumitw/otter-cli
otter --help
```

The package requires Node.js 20 or newer.

## Authorization

The CLI connects to `https://otter.narumi.dev/` by default. Override the server with `OTTER_URL`.

```bash
otter auth login
otter auth status
```

Device login stores the token in `~/.config/otter/credentials.json`. For ephemeral automation, create a named 90-day token under **Account settings → API tokens** in the Otter web app, copy it when shown, and provide it through a secret manager instead:

```bash
OTTER_TOKEN='otter_api_…' otter trips list
```

The plaintext token is shown only once. Revoke active personal and device tokens from the same account settings page.

## Commands

```bash
otter trips list
otter trips get --trip <trip-id>
otter participants list --trip <trip-id>
otter expenses list --trip <trip-id>
otter balances get --trip <trip-id>
otter settlements list --trip <trip-id>
otter trips get --trip <trip-id> > trip.json
otter settlements preview --input trip.json
```

Run `otter --help` for all commands and options. Successful data commands print JSON to stdout; errors print JSON to stderr and exit non-zero. `settlements preview` validates a saved trip payload and calculates balances locally without credentials or network access; use `--input -` to read JSON from stdin.

## Development

```bash
npm run otter -- --help
npm run typecheck --workspace @narumitw/otter-cli
npm run build:cli
npm pack --dry-run --workspace @narumitw/otter-cli
```
