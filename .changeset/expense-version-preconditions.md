---
"@narumitw/otter-cli": minor
---

Breaking change: `expenses update` and `expenses delete` now require `--version` from the expense returned by `expenses list` or `trips get`. The CLI sends that version in `If-Match`; deletion still requires `--yes`.

Stale writes fail with HTTP 412 and JSON code `EXPENSE_VERSION_CONFLICT`, without fetching a newer version or retrying. Reread and review intervening changes before submitting again. Coordinate the CLI/API upgrade: older clients without the header receive HTTP 428. Legacy versionless trip JSON remains supported for offline settlement previews.
