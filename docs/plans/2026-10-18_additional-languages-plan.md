# Additional language support

## Goal

Add complete browser UI support for the 14 languages below. Keep the existing Traditional Chinese (`zh-TW`), English (`en`), Japanese (`ja`), and Korean (`ko`) support. The result is 18 selectable languages with tested detection, persistence, formatting, and accessible layouts.

| Language | Catalog locale | Native selector label |
| --- | --- | --- |
| Hindi | `hi` | हिन्दी |
| Spanish | `es` | Español |
| French | `fr` | Français |
| Portuguese | `pt` | Português |
| Indonesian | `id` | Bahasa Indonesia |
| German | `de` | Deutsch |
| Vietnamese | `vi` | Tiếng Việt |
| Turkish | `tr` | Türkçe |
| Filipino | `fil` | Filipino |
| Thai | `th` | ไทย |
| Italian | `it` | Italiano |
| Polish | `pl` | Polski |
| Malay | `ms` | Bahasa Melayu |
| Dutch | `nl` | Nederlands |

## Context

- `apps/web/src/client/i18n/locales.ts` defines the selector options, derives `Locale`, and matches browser preferences in order. Unmatched browser preferences fall back to English. Chinese language tags currently map to `zh-TW`.
- `apps/web/src/client/i18n/messages.ts` registers complete catalogs. `Messages` derives from the composed Traditional Chinese catalog through `CatalogShape`.
- Catalogs include feature modules, not just their main files. Examples include `messages-personal.ts`, `messages-visa.ts`, `messages-interface.ts`, and the English account and queue modules. Japanese and Korean also use separate settings modules.
- `apps/web/src/client/i18n/message-types.ts` provides interpolation and an English singular/plural helper. That helper is not sufficient for all requested languages, particularly Polish.
- `apps/web/src/client/i18n.tsx` owns locale state, `otter.locale` browser storage, document language, currency display, and translation of mapped server errors. `client-support.ts` sends the active locale in `Accept-Language`.
- Login/registration, the account menu, and account settings already consume the shared language options. The account menu currently lists each language directly.
- Catalog and component tests currently target selected locales. Several tests treat French as unsupported; those fixtures must change when French is registered.
- Browser tests live in `apps/web/tests/e2e/`. Existing helpers check accessibility and horizontal overflow. `apps/web/src/client/index.css` uses Geist with Chinese and generic font fallbacks.
- `docs/product.md` documents the current four languages and browser-local preference behavior.

### Execution record

- Base: `origin/main` at `422ebcf`; branch: `narumi/feat/additional-languages`.
- Preserved the supplied untracked plan. No unrelated tracked changes were present.
- Baseline `npm run build` passed: main JavaScript 1,000.62 kB, 297.48 kB gzip; CSS 774.54 kB, 100.72 kB gzip.
- Created an isolated PostgreSQL 17 test container on port 55439 and applied all 24 migrations. Existing development services and databases were not changed.
- Chromium is available; installed Playwright Firefox for the additional script-rendering check.
- All 18 composed catalogs have 830 keys and 77 formatters. All new catalog modules are below 1,000 lines; the largest is 660 lines.
- Focused Vitest validation passed: 6 files, 316 tests. Catalog rejection tests permanently verify missing keys, wrong types, and lost parameters without leaving temporary defects in source.
- `DATABASE_URL=<isolated test database> npm run check` passed: Biome, strict TypeScript, 982 tests across 110 files (151 API tests with database-dependent tests enabled and no API skips), and all production builds. A simultaneous browser run was invalidated by build-triggered Vite reloads; browser checks are being rerun without concurrent builds.
- Read-only code/content reviews covered all 54 new catalog modules and the runtime/test diff. No unresolved correctness, security, lifecycle, compatibility, or scope defect was identified. This was not external fluent sign-off.
- Candidate main JavaScript is 1,842.48 kB, 525.92 kB gzip. Gzip growth is 228.44 kB (76.8%); CSS is 774.61 kB, 100.75 kB gzip (0.03 kB gzip growth). This is material and not accepted. No code splitting was added without approval.
- The first full browser run passed 132/134 tests, including all 29 new localization cases. The two failures showed that the 18-option account menu exceeded the existing 400 px compact-height check. Added a 25 rem/available-viewport cap using Radix's existing scroll viewport; preserved the 400 px test. The focused light/dark expense-layout and Hindi keyboard tests then passed (3/3). The later one-worker full run passed as recorded below.
- Repeated `npm run check` after the menu fix: all checks passed with the isolated database. `npm run test:components` also passed: 37 files, 482 tests.
- Chromium 156.0.8078.4 light/dark screenshots for Hindi, Thai, and Vietnamese were visually inspected by the assistant. Firefox 157.0 passed all three script workspace flows, including light/dark accessibility checks; its light/dark screenshots were also visually inspected. No missing glyphs, clipped marks, or unreadable wrapping were identified. This is a rendering check, not fluent language review. Screenshots remain untracked test artifacts.
- A subsequent full browser run reused the first run's database and passed 128/134 tests, including all localization and compact-menu checks. The six failures were existing seeded-workflow count/duplicate-description assertions against rows left by the first run (timestamps confirmed reuse). Created a new database in the same isolated test container, applied 24 migrations, and started a clean full run. No shared or production data was reset; documented the fresh-database prerequisite.
- The fresh four-worker run passed 129/134 tests. French/Portuguese locale flows and an existing responsive flow hit the 30-second overall test limit; two existing login helpers timed out while sign-in remained pending. A direct Bank of Taiwan fetch then succeeded in 0.61 seconds. No product defect or live-provider cause is proven from these timings. Reopened the locale browser task and started a complete one-worker run on another new, migrated database. No assertion, timeout, or acceptance threshold was relaxed.
- Final complete Chromium run passed: `DATABASE_URL=<new isolated migrated database> OTTER_E2E_WEB_PORT=18463 OTTER_E2E_API_PORT=18464 npm run test:e2e -- --workers=1`: 134/134 tests, 7.2 minutes, no retries. This includes all 29 new localization cases, existing compact-menu checks, real API/database workflows, and native WebMCP checks. The earlier four-worker timing failures remain documented; no claim of stable four-worker execution is made.
- All local implementation checks are now complete. Release remains blocked on fluent review or explicit review-risk acceptance, confirmation of provisional editorial choices, and acceptance of the 228.44 kB gzip JavaScript increase. Keep this plan and deliver a draft pull request until those gates are resolved.
- Catalog drafting uses provisional neutral Spanish and Brazilian Portuguese wording. These editorial choices are not user-approved. No external fluent reviewers are assigned; the editorial/review tasks remain open. Draft implementation does not satisfy the release review gate.

## Architecture

- Keep locale registration, catalogs, formatting, and translation tests in `apps/web`. Keep the current React provider and typed catalog structure; do not introduce a translation framework or service.
- Use the base locale identifiers in the table for storage, `document.documentElement.lang`, and request headers.
  - Match regional browser tags such as `es-MX`, `pt-BR`, `pt-PT`, and `fr-CA` to their base catalog.
  - Treat `fil` as the canonical Filipino locale. Map browser tags `tl` and `tl-PH` to `fil`; do not add a second selectable catalog.
  - Preserve preference order, case-insensitive detection, the existing Chinese mapping, and English fallback. Stored preferences remain canonical catalog identifiers only.
- Keep all catalogs complete and checked against the composed source catalog. Do not fill gaps by spreading English or Traditional Chinese into a new catalog.
- Use locale-specific message functions and `Intl.PluralRules` where grammar requires them. Keep the existing English helper unchanged unless a tested correction is necessary.
- Keep translation separate from expense data. A language change must not change stored amounts, currency support, exchange rates, date values, CSV/backup schemas, or user-entered text.

## Non-Goals

- CLI localization, translated API response bodies, account-synchronized language preferences, or database migrations.
- New currencies, locale-specific amount input parsing, or changes to balance and settlement calculations.
- Separate regional catalogs, automatic translation of user data, right-to-left layouts, or an unrelated UI redesign.
- Catalog lazy loading or new font dependencies without measured need.

## Assumptions and Unknowns

- One catalog per requested language is sufficient. Spanish and Portuguese regional wording is not specified.
  - Before translation starts, obtain acceptance of an editorial variant for each language where this affects wording, particularly Spanish and Portuguese. Keep the base catalog identifiers above unless that review identifies a product requirement for regional catalogs.
- Fluent review is required for each new language. Reviewer availability is unknown. Automated completeness tests do not prove translation accuracy.
  - If a reviewer is unavailable, leave that language's review open. An explicit user acceptance of the review risk is required before completion.
- Hindi and Thai font coverage, Vietnamese diacritics, the 18-option menu, and total catalog bundle growth need measurement during implementation.

## Plan

- [ ] Confirm translation scope and editorial choices against the composed `Messages` catalog; record regional wording choices, a short glossary for expense/share/balance/settlement terms, and a fluent reviewer or explicit review-risk acceptance path for each new language. Acceptance: all 14 languages have documented choices and review ownership before their translation batch starts.

- [x] Extend catalog integrity tests in `apps/web/src/client/i18n/messages.test.ts` to iterate over all registered catalogs; verify exact key sets, string/function parity, non-empty output, and matching interpolation parameters. Exercise formatter branches with numeric values and verify supplied names, amounts, and counts survive interpolation. Acceptance: tests pass for current catalogs and fail for a missing key, wrong message type, or lost parameter in a temporary local negative check; remove temporary defects afterward.

- [x] Add the minimum plural support required by the new catalogs in `message-types.ts` or directly in catalog functions; retain placeholder-safe output when tests call a formatter with missing values. Add expected-output tests for Polish counts `0`, `1`, `2`, `5`, `12`, `21`, and `22`, plus relevant zero/one/other and decimal cases for the other languages. Acceptance: all used plural branches have tests, and existing English, Japanese, and Korean count tests still pass.

- [x] Implement and register complete Hindi, Spanish, French, and Portuguese catalogs under `apps/web/src/client/i18n/`. Add their native labels to `languageOptions`; test canonical IDs and regional browser tags. Acceptance: each composed catalog satisfies `CatalogShape<typeof zhTW>`, passes the integrity and plural tests, and includes every current feature and mapped error message. Replace French-as-unsupported test fixtures with a genuinely unsupported locale in the same change.

- [x] Implement and register complete Indonesian, German, Vietnamese, and Turkish catalogs using the same typed structure. Acceptance: all four catalogs pass integrity, interpolation, detection, and relevant plural tests without fallback-language spreads.

- [x] Implement and register complete Filipino, Thai, Italian, and Polish catalogs; add the browser-only `tl`/`tl-PH` alias for `fil`. Acceptance: all four catalogs pass integrity and grammar tests; browser aliases resolve to `fil`, while storage validation accepts only canonical catalog IDs.

- [x] Implement and register complete Malay and Dutch catalogs. Keep each new source file below 1,000 lines by splitting cohesive feature sections, following the existing settings-module pattern. Acceptance: all 18 registered catalogs pass the shared integrity suite and TypeScript checks; new catalog modules stay below the line limit.

- [x] Expand `i18n.component.test.tsx`, `auth-screen.component.test.tsx`, `account-menu.component.test.tsx`, and `account-settings-page.component.test.tsx` to cover all selectable locales. Verify browser preference order, saved preference priority, unsupported and malformed values, denied storage, all three selectors, reload persistence, `lang`, selected-state indicators, and `Accept-Language`. Verify switches preserve entered form values and clear stale localized auth errors. Acceptance: parameterized component tests pass for all 18 locales, including mapped parameterized errors and unchanged unknown-error pass-through.

- [x] Verify currency and date displays for all locales using existing `Intl` formatting paths. Cover negative and zero amounts, a supported zero-decimal currency, and a supported two-decimal currency; include Hindi grouping and European decimal/group separators. Acceptance: tests match the intended `Intl` output without changing numeric data or input parsing, and language switching does not mutate expense or settlement payloads.

- [x] Add `apps/web/tests/e2e/localization.spec.ts` using existing fixture, accessibility, and overflow helpers. Run a smoke flow for every new locale through authentication, group/participant/expense views, balances, settlements, and settings; include an error and a reload. Check all 18 selector options and keyboard access to the final option and sign-out. Acceptance: automated assertions pass at 375 px and 1280 px; targeted 320 px checks pass for long German/Polish text and Hindi/Thai script. Check localized accessible names and run accessibility checks in these views.
  - Adjust menu scrolling, wrapping, spacing, or font fallbacks only where these checks show a defect. Review Hindi/Thai glyph shaping and Vietnamese diacritics in light and dark themes on Chromium, plus a documented Safari or Firefox manual spot check. Record the browser, locale, and result; do not commit screenshots or test artifacts.

- [ ] Complete fluent review of each new catalog and resolve terminology, grammar, destructive-action warnings, and truncation defects. Record per-language review results or explicit user acceptance of any remaining review risk. Compare a baseline and final Vite production build for compressed JavaScript size; record the delta and obtain acceptance if loading cost is material. Acceptance: no unresolved translation defects or unaccepted review/performance risks remain.

- [x] Update `docs/product.md` with all supported languages, base-locale regional matching, Filipino alias behavior, and unchanged browser-local storage semantics. Add concise catalog and validation guidance to `docs/development.md`; add the required Changesets file using `npm run changeset` for the web package. Acceptance: documentation matches tested behavior and the release note lists the 14 added languages without claiming CLI or server-body translation.

- [x] Run repository validation from the root: `npm run check`, `npm run test:components`, and `npm run test:e2e`. Install Chromium and provide `DATABASE_URL` with migrations applied for the full browser suite; ensure database-dependent API tests actually run. Acceptance: record commands and outcomes, with no skipped required checks. If infrastructure or reviewer access is missing, leave the affected tasks open and state what is needed.

## Risks

- Incorrect financial or destructive-action text can mislead users.
  - Require fluent review of balance direction, payer/share distinctions, settlement actions, and delete confirmations.
- Missing keys can be hidden by fallback spreads; plural errors can be hidden by testing only empty formatter values.
  - Require complete catalogs and branch-specific output tests before registration is accepted.
- Longer text and non-Latin scripts can make controls inaccessible.
  - Use measured layout fixes and browser review rather than smaller text or removal of labels.
- Fourteen additional eager-loaded catalogs increase download size.
  - Measure the production build first. Add a loading change only if the measured result requires it; preserve provider, error translation, and offline behavior if such a change is approved.

## Rollback / Recovery

- Release these changes as a web update with no database or API schema migration.
- If a release has a critical translation or UI defect, redeploy the previous application version. Existing data and monetary values require no conversion.
- A previous version ignores newly stored locale identifiers and uses browser detection, then its existing fallback. Verify this with an unsupported stored-locale regression test. Do not clear unrelated browser storage or offline drafts.

## Completion Checklist

- [ ] All 14 requested languages are complete, selectable, and reviewed or have explicit user acceptance of the remaining review risk; the existing four languages still work.
- [x] Automated checks cover catalog parity, interpolation, plural branches, regional detection, Filipino aliases, storage, all selectors, request headers, errors, currency display, and unchanged data payloads.
- [x] Browser evidence confirms readable scripts, accessible keyboard navigation, reachable menu actions, and no horizontal overflow at the stated sizes.
- [ ] Production bundle growth is recorded and accepted; no material unknown or risk lacks a disposition.
- [x] `npm run check`, `npm run test:components`, and `npm run test:e2e` pass with required database coverage; documentation, Changesets, and rollback checks are complete.
- [ ] The final diff contains only intended source, tests, documentation, and Changesets changes, with no generated files, secrets, or binary test artifacts. Provide the implementation handoff, then delete this plan only after every task and completion check above has passed.
