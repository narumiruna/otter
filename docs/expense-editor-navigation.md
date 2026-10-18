# Expense editor navigation

## URLs and state

The browser app uses these query parameters:

- List: `?trip=<trip-id>&view=expenses`.
- Editor: `?trip=<trip-id>&view=expenses&mode=edit-expense&expense=<expense-id>`.

`url-state.ts` owns URL parsing and writing. `AuthenticatedWorkspace` selects the editor from this location, not from list-local state. Missing expenses, unavailable groups, archived groups, and read-only payloads do not produce an editable form. Existing list and add-expense URLs remain valid.

## Return and browser history

Opening an expense creates a history entry. The editor records an adjacent list source when it has one. The return button, Cancel, and a successful save return to that entry. Without a list source, page return replaces the editor entry with the same group's list. Native Back keeps the real source, including Overview or a previous document.

Forward opens the saved expense again. Online entry refreshes trip data before it creates an editable form. A failed refresh shows retry controls, not a stale form. Offline entry uses the loaded data and keeps online-only writes disabled. Forward does not restore a discarded draft or repeat a write request.

`workspace-history.ts` owns a versioned history-state namespace. It preserves unrelated state and indexes app-created entries, including account settings. A rejected same-document traversal uses the inverse index delta. It does not add an entry. Unknown or older metadata uses safe defaults. Legacy same-document entries without a usable index can only restore the accepted URL in place.

List entries store the filters, sort, grouping, scroll position, and source expense ID needed for return. Column preferences keep their existing user-scoped storage. The app restores list content before focus and scroll. It uses the list heading when the source expense is no longer present. User input during a pending restore takes priority over automatic focus and scroll.

## Unsaved changes and requests

Page actions use the existing discard dialog. Browser traversal uses a native confirmation. Reload and document exit use `beforeunload`; the browser controls its text and availability.

The app blocks same-document editor exit during a form submission and prevents duplicate form submissions. A full document exit cannot guarantee cancellation of a request already sent to the server. Check the saved expense after an interrupted request before submitting again.

Account settings keep the editor mounted and preserve its draft. Merely opening or closing account settings is not a discard action. Opening settings is blocked during form submission. A late delete or restore result can navigate only from its initiating editor entry; it cannot redirect another page. Expense drafts are not stored in history state or the URL.

## Responsive action bar

The header and desktop action bar use the same shell width and horizontal gutter. Their visible backgrounds are bounded by the centered app shell, not the full width of an ultrawide viewport. The footer inner container owns the total and button layout.

- At 901 CSS px and above, the action bar is fixed.
- From 681 through 900 CSS px, it stays in document flow.
- At 680 CSS px and below, it is sticky and keeps the safe-area padding.

A ResizeObserver measures the visible bar. The app uses its height for desktop content, sidebar, and scroll clearance. Hidden or removed editors release the measurement. The sticky mobile bar already occupies document space and does not need a second placeholder.

## Checks

Run `npm run check` and the interface browser suites with `npm run test:e2e -- --config playwright.interface.config.ts`. The interface suites use API mocks and need Chromium but not PostgreSQL. Real API workflow suites need a fresh, migrated disposable database because some assertions use the initial development seed. Do not use an application database. Complete package builds before concurrent browser runs; Vite can reload pages when shared package output changes.

Browser coverage includes history in both directions, multiple-entry traversal, direct URLs, reload, dirty drafts, save failures and conflicts, pending saves, list restoration, account settings, breakpoint boundaries, ultrawide alignment, translated errors, text scaling, safe areas, and print.
