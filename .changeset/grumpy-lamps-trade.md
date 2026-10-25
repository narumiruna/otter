---
"@narumitw/otter-api": minor
"@narumitw/otter-web": minor
"@narumitw/otter-core": minor
"@narumitw/otter-contracts": minor
"@narumitw/otter-cli": minor
---

Use Visa as the only automatic exchange-rate source. Save dated base-currency, payment, and bridge snapshots without bank or fixed-rate fallback. Keep historical snapshots and the bank-rate workspace. Export complete version 3 backups and retain old backup readers.

Deploy compatible API, Web, and CLI readers together after migrations 027 and 028. Floating legacy conversions require an approved cutover baseline; missing data stops the migration. See docs/visa-rate-cutover.md before deployment.
