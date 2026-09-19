# Otter CLI Command Reference

Run commands from the Otter repository root as `npm run --silent otter -- <command>`.
Run `npm run --silent otter -- --help` for the installed command list.

## Authorization

Set `OTTER_URL` to the Otter server URL or omit it for `http://localhost:17463`.
Run `npm run --silent otter -- auth login` to start device authorization, open Otter, and wait for the user to approve the displayed code.
Add `--no-open` when the browser must be opened manually, and use `--client-name <name>` to identify the requesting agent or machine.
The CLI stores the issued token by server URL in `~/.config/otter/credentials.json` with mode `0600`.
Set `OTTER_CONFIG_PATH` only when a different credential file is required.
Set `OTTER_TOKEN` from a secret manager for ephemeral agent or CI use without persistence.
Run `npm run --silent otter -- auth status` to verify authorization.
Run `npm run --silent otter -- auth logout` to revoke the current stored token and remove it locally.
Never ask the user for their Otter password or print an access token.
Remote HTTP is rejected unless `OTTER_ALLOW_INSECURE_HTTP=1` is explicitly set.

## Read Commands

```bash
npm run --silent otter -- me
npm run --silent otter -- trips list
npm run --silent otter -- trips get --trip <trip-id>
npm run --silent otter -- participants list --trip <trip-id>
npm run --silent otter -- expenses list --trip <trip-id>
npm run --silent otter -- balances get --trip <trip-id>
npm run --silent otter -- settlements list --trip <trip-id>
```

`trips get` returns the complete trip payload.
`balances get` returns current balances and suggested settlements.
`settlements list` returns suggested settlements and recorded payments.

## Trip Commands

```bash
npm run --silent otter -- trips create --name <name> [--currency TWD]
npm run --silent otter -- trips update --trip <trip-id> [--name <name>] [--currency USD] [--archived true|false]
npm run --silent otter -- trips delete --trip <trip-id> --yes
```

Supported currencies are `TWD`, `JPY`, `USD`, and `EUR`.
Only run `trips delete` after explicit approval because it deletes the whole group and its records.

## Participant Commands

```bash
npm run --silent otter -- participants add --trip <trip-id> --name <name>
npm run --silent otter -- participants rename --trip <trip-id> --participant <participant-id> --name <name>
npm run --silent otter -- participants delete --trip <trip-id> --participant <participant-id> --yes
```

Otter rejects deletion when the participant is used by an expense or payment record.

## Expense Commands

```bash
npm run --silent otter -- expenses add \
  --trip <trip-id> \
  --description <text> \
  --amount <major-unit-amount> \
  --currency <code> \
  --paid-by <participant-id> \
  --split-with <participant-id,participant-id> \
  [--date YYYY-MM-DD] \
  [--category <name>] \
  [--tags <tag,tag>]

npm run --silent otter -- expenses update \
  --trip <trip-id> \
  --expense <expense-id> \
  [--description <text>] \
  [--amount <major-unit-amount>] \
  [--currency <code>] \
  [--paid-by <participant-id>] \
  [--split-with <participant-id,participant-id>] \
  [--date YYYY-MM-DD] \
  [--category <name>] \
  [--tags <tag,tag>]

npm run --silent otter -- expenses delete --trip <trip-id> --expense <expense-id> --yes
```

The available categories are `餐飲`, `交通`, `住宿`, `門票`, `購物`, and `其他`.
Omit optional add fields to use server defaults.
Pass `--tags ""` on update to clear all tags.
The CLI creates equal splits and does not expose custom amounts, percentages, or shares.

## Settlement Commands

```bash
npm run --silent otter -- settlements record \
  --trip <trip-id> \
  --from <participant-id> \
  --to <participant-id> \
  --amount <major-unit-amount> \
  [--currency <code>] \
  [--date YYYY-MM-DD] \
  [--note <text>]

npm run --silent otter -- settlements delete --trip <trip-id> --payment <payment-id> --yes
```

Omitting settlement currency uses the trip base currency.
Recording a settlement is a write, not a transfer of real funds.

## Output and Errors

Successful data commands write JSON to stdout.
Errors write an object shaped as `{"error":{"code":"...","message":"...","status":400}}` to stderr and exit non-zero.
The `status` field appears only for HTTP response errors.
Treat `CONFIG_ERROR`, `INSECURE_HTTP`, `AUTH_ERROR`, `CONNECTION_ERROR`, and HTTP `401` or `403` as blockers rather than retryable failures.
