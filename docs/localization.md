# Browser localization

## Scope

Otter has 18 browser UI catalogs. Language selection affects interface text, mapped errors, and `Intl` money and date display. It does not change stored data, money calculations, amount input syntax, currencies, CSV headers, JSON backup keys, or CLI output. User-entered names and descriptions are not translated.

The browser stores the canonical locale in `otter.locale`. A valid stored choice takes priority over ordered browser preferences. Unsupported or invalid stored values use browser detection; unsupported browser preferences fall back to English. Denied browser storage does not prevent an active language change. Existing Chinese matching remains unchanged.

Regional tags use the base catalog: `es-MX` uses `es`, `fr-CA` uses `fr`, and both `pt-BR` and `pt-PT` use `pt`. Browser tags `tl` and `tl-PH` use `fil`. Aliases and regional tags are not valid stored choices. Regional matching does not provide a separate regional translation or regional formatting preference.

## Editorial choices and review

The 14 added catalogs are machine-authored drafts. Fluent reviewers are not assigned. No fluent review or user acceptance of the remaining translation risk is recorded. These are release blockers, not completed checks. Neutral Spanish and Brazilian Portuguese are provisional choices that also need confirmation.

The table records the current glossary. A fluent reviewer must check financial directions, payer/share distinctions, representative balances, destructive actions, permissions, uncertain writes, and offline data-loss warnings. A balance of zero for a represented participant must not imply that the participant made a payment.

| Locale | Editorial choice | Expense | Share | Balance | Settlement |
| --- | --- | --- | --- | --- | --- |
| `hi` | Modern Hindi; polite instructions | खर्च | हिस्सा | शेष राशि | हिसाब चुकाना |
| `es` | Neutral international Spanish; tú | gasto | parte del gasto | saldo | liquidación |
| `fr` | Standard French; vous | dépense | part | solde | règlement |
| `pt` | Brazilian Portuguese; você | despesa | parte da despesa | saldo | acerto |
| `id` | Standard Indonesian; Anda | pengeluaran | bagian | saldo | pelunasan |
| `de` | Standard German; du | Ausgabe | Anteil | Saldo | Ausgleich |
| `vi` | Modern standard Vietnamese | chi phí | phần chi phí | số dư | thanh toán công nợ |
| `tr` | Modern standard Turkish | gider | pay | bakiye | hesap kapatma |
| `fil` | Modern Filipino | gastos | bahagi sa gastos | balanse | pag-aayos ng utang |
| `th` | Modern standard Thai | ค่าใช้จ่าย | ส่วนที่รับผิดชอบ | ยอดคงเหลือ | การชำระหนี้ |
| `it` | Standard Italian; direct instructions | spesa | quota | saldo | pagamento di saldo |
| `pl` | Standard Polish; direct instructions | wydatek | udział w kosztach | saldo | rozliczenie |
| `ms` | Standard Malay; anda | perbelanjaan | bahagian | baki | penyelesaian |
| `nl` | Standard Dutch; je | uitgave | aandeel | saldo | verrekening |

## Catalog maintenance

- Register native language labels in `apps/web/src/client/i18n/locales.ts` and complete catalogs in `messages.ts`.
  - Keep existing canonical locale identifiers stable.
  - Keep browser aliases separate from stored identifiers.
- Check the composed catalog with `satisfies CatalogShape<typeof zhTW>`.
  - Translate every source key, including keys from feature modules.
  - Split large catalogs into modules for the same language. Do not spread another language into a catalog.
  - Keep each new source file below 1,000 lines.
- Preserve string/function kinds and interpolation names in every grammatical branch.
  - Use `pluralForm` for locale-specific cardinal agreement where necessary. Invariant count constructions are valid where natural.
  - Preserve unresolved parameters when formatter values are absent; catalog integrity tests use this behavior.
  - Keep proper product and technical names where required.
- Run catalog tests, component tests, and browser localization tests after changes. See [development commands](development.md#browser-localization).
  - Automated checks prove structural completeness, not translation accuracy.

## Delivery size

The catalogs remain eager-loaded so locale switching and mapped errors keep their existing synchronous behavior. No loading framework, font dependency, or network translation service was added.

| Production asset | Baseline | With 18 catalogs | Increase |
| --- | --- | --- | --- |
| Main JavaScript | 1,000.62 kB | 1,842.48 kB | 841.86 kB |
| Main JavaScript, gzip | 297.48 kB | 525.92 kB | 228.44 kB (76.8%) |
| CSS, gzip | 100.72 kB | 100.75 kB | 0.03 kB |

These values are from Vite production builds on the implementation branch. The compressed JavaScript increase is material and needs explicit acceptance before release. Catalog code splitting is not implemented; it would require separate approval and tests for initial locale loading, synchronous error translation, and offline state.

## Recovery

This feature needs no database migration. Redeploy the previous application version to remove the new catalogs. The previous locale validator ignores newly stored identifiers and uses its browser detection and fallback. Do not delete browser storage, offline drafts, or expense data as part of this recovery.
