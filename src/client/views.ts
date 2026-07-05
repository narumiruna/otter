import { expenseCategories } from "../shared/expense-metadata.js";
import {
  type Currency,
  currencies,
  currencyInfo,
  formatMinor,
  toMajor,
} from "../shared/money.js";
import type { Balance, Expense, Trip } from "../shared/settlement.js";
import {
  type AppState,
  defaultExpenseFormValues,
  expenseSplitLabel,
  filterAndSortExpenses,
  htmlEscape,
  participantDeleteBlockReason,
  spendingSummary,
  splitCountLabel,
  type TripPayload,
  type TripSummary,
  todayDate,
  type WorkspaceTab,
  workspaceTabs,
} from "./client-support.js";
import { restoreBackupForm, settingsPanel } from "./settings-view.js";

export function authView(state: AppState): string {
  return `
    <section class="grid auth-grid">
      <article class="card stack auth-copy">
        <p class="eyebrow">旅行拆帳，不靠腦補</p>
        <h2>把支出、餘額和結清建議放在同一個工作區。</h2>
        <ul class="feature-list">
          <li>先建支出群組，再邀成員一起分帳。</li>
          <li>記錄付款人、貨幣與分帳對象。</li>
          <li>即時查看誰應收、誰應付。</li>
        </ul>
      </article>
      <article class="card stack auth-card">
        <h2>登入</h2>
        <form id="login-form" novalidate${formErrorAttributes(state, "login-form")}>
          ${formErrorHtml(state, "login-form")}
          <label>Email<input name="email" type="email" autocomplete="email" required /></label>
          <label>密碼<input name="password" type="password" autocomplete="current-password" required /></label>
          <p class="helper-text">使用註冊時設定的 email 和密碼登入。</p>
          <button data-busy-action="login" data-busy-label="登入中…" type="submit">登入</button>
        </form>
      </article>
      <article class="card stack auth-card">
        <h2>註冊</h2>
        <form id="register-form" novalidate${formErrorAttributes(state, "register-form")}>
          ${formErrorHtml(state, "register-form")}
          <label>名稱<input name="name" autocomplete="name" required maxlength="80" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" required /></label>
          <label>密碼<input name="password" type="password" autocomplete="new-password" minlength="8" aria-describedby="register-password-help" required /></label>
          <p id="register-password-help" class="helper-text">密碼至少 8 個字。</p>
          <button data-busy-action="register" data-busy-label="建立中…" type="submit">建立帳號</button>
        </form>
      </article>
    </section>
  `;
}

export function dashboardView(state: AppState): string {
  return `
    <section class="grid dashboard-grid">
      <aside class="card stack trip-sidebar">
        <h2>支出群組</h2>
        <div class="trip-list stack">
          ${
            state.trips.length
              ? state.trips
                  .map((trip) => tripButton(trip, state.selected?.trip.id))
                  .join("")
              : '<p class="muted">還沒有支出群組，先新增一個。</p>'
          }
        </div>
        ${archivedTripList(state.archivedTrips, state.selected?.trip.id)}
        <details class="trip-create" ${state.trips.length ? "" : "open"}>
          <summary>新增支出群組</summary>
          <form id="trip-form">
            <label>名稱<input name="name" required maxlength="100" placeholder="東京五日遊" /></label>
            <label>基準貨幣${currencySelect("baseCurrency", "TWD")}</label>
            <button data-busy-action="trip-create" data-busy-label="新增中…" type="submit">新增支出群組</button>
          </form>
        </details>
        ${state.selected ? "" : restoreBackupForm()}
      </aside>
      ${state.selected ? tripView(state) : '<section class="card empty-state"><h2>先選擇支出群組</h2><p class="muted">選擇或新增支出群組後開始記帳。</p></section>'}
    </section>
  `;
}

export function readonlyShareView(payload: TripPayload): string {
  return `
    <section class="stack trip-detail readonly-share">
      <article class="card stack trip-summary">
        <p class="eyebrow">唯讀分享</p>
        <div class="trip-summary-header">
          <div class="trip-title">
            <h2>${htmlEscape(payload.trip.name)}</h2>
            <p class="muted">此頁只能查看支出、餘額與結清建議，不能修改資料。</p>
          </div>
          ${tripStatStrip(payload.trip)}
        </div>
      </article>
      <article class="card stack results-card">
        ${payload.trip.expenses.length === 0 ? '<p class="muted">還沒有支出。</p>' : spendingCharts(payload.trip)}
        <section class="summary-section">
          <h3>分帳結果</h3>
          ${balanceList(payload.balances)}
        </section>
        <section class="summary-section">
          <h3>結清建議</h3>
          ${readonlySettlementList(payload)}
        </section>
        <section class="summary-section">
          <h3>支出紀錄</h3>
          ${readonlyExpenseList(payload.trip)}
        </section>
      </article>
    </section>
  `;
}

function archivedTripList(
  trips: TripSummary[],
  selectedTripId?: string,
): string {
  if (trips.length === 0) {
    return "";
  }
  return `
    <details class="archived-trips">
      <summary>已封存支出群組</summary>
      <div class="trip-list stack">
        ${trips.map((trip) => tripButton(trip, selectedTripId)).join("")}
      </div>
    </details>
  `;
}

function tripButton(trip: TripSummary, selectedTripId?: string): string {
  const isActive = selectedTripId === trip.id;
  const active = isActive ? " active" : "";
  return `
    <button class="${active}" data-trip-id="${htmlEscape(trip.id)}" data-busy-action="trip-select:${htmlEscape(trip.id)}" data-busy-label="載入中…" type="button" aria-pressed="${isActive}"${isActive ? ' aria-current="true"' : ""}>
      <strong>${htmlEscape(trip.name)}</strong><br />
      <span class="muted">${trip.participantCount} 人 · ${trip.expenseCount} 筆 · ${trip.baseCurrency}${trip.archivedAt ? " · 已封存" : ""}</span>
    </button>
  `;
}

function tripView(state: AppState): string {
  const payload = state.selected;
  if (!payload) {
    return '<section class="card empty-state"><h2>先選擇支出群組</h2><p class="muted">選擇或新增支出群組後開始記帳。</p></section>';
  }
  const activeTab = state.activeTab;
  const { trip } = payload;
  return `
    <section class="stack trip-detail">
      <article class="card stack trip-summary">
        <div class="trip-summary-header">
          <div class="trip-title">
            <h2>${htmlEscape(trip.name)}</h2>
            <p class="muted">基準貨幣：${trip.baseCurrency}。匯率目前使用固定原型值，可之後改接即時匯率。</p>
          </div>
          ${tripStatStrip(trip)}
        </div>
        ${workspaceTabBar(activeTab)}
      </article>
      ${workspacePanel(state, payload, activeTab)}
    </section>
  `;
}

function tripStatStrip(trip: Trip): string {
  return `
    <div class="stat-strip" aria-label="支出群組摘要">
      <div class="stat"><span>${trip.participants.length}</span><small>成員</small></div>
      <div class="stat"><span>${trip.expenses.length}</span><small>支出</small></div>
      <div class="stat"><span>${trip.baseCurrency}</span><small>基準</small></div>
    </div>
  `;
}

function workspaceTabBar(activeTab: WorkspaceTab): string {
  return `
    <nav class="workspace-tabs" aria-label="支出群組工作區" role="tablist">
      ${workspaceTabs
        .map((tab) => {
          const active = tab === activeTab;
          const controls = active
            ? ` aria-controls="${workspacePanelId(tab)}"`
            : "";
          return `
            <button id="${workspaceTabId(tab)}" class="secondary${active ? " active" : ""}" data-workspace-tab="${tab}" type="button" role="tab" aria-selected="${active}" tabindex="${active ? 0 : -1}"${controls}>
              ${workspaceTabLabel(tab)}
            </button>
          `;
        })
        .join("")}
    </nav>
  `;
}

function workspaceTabId(tab: WorkspaceTab): string {
  return `workspace-tab-${tab}`;
}

function workspacePanelId(tab: WorkspaceTab): string {
  return `workspace-panel-${tab}`;
}

function workspaceTabLabel(tab: WorkspaceTab): string {
  switch (tab) {
    case "overview":
      return "總覽";
    case "add-expense":
      return "記帳";
    case "expenses":
      return "支出紀錄";
    case "members":
      return "成員";
    case "settings":
      return "設定/匯出";
  }
}

function workspacePanel(
  state: AppState,
  payload: TripPayload,
  activeTab: WorkspaceTab,
): string {
  switch (activeTab) {
    case "overview":
      return overviewPanel(payload);
    case "add-expense":
      return `
        <article id="${workspacePanelId("add-expense")}" class="card stack expense-create-card" data-workspace-panel="add-expense" role="tabpanel" aria-labelledby="${workspaceTabId("add-expense")}">
          <h3>記帳</h3>
          ${addExpenseContent(state, payload.trip)}
        </article>
      `;
    case "expenses":
      return `
        <article id="${workspacePanelId("expenses")}" class="card stack expense-list-card" data-workspace-panel="expenses" role="tabpanel" aria-labelledby="${workspaceTabId("expenses")}">
          <h3>支出紀錄</h3>
          ${expenseFiltersForm(state, payload.trip)}
          ${expenseList(state, payload.trip)}
        </article>
      `;
    case "members":
      return membersPanel(payload.trip);
    case "settings":
      return settingsPanel(state, payload);
  }
}

function needsMembersBeforeFirstExpense(trip: Trip): boolean {
  return trip.participants.length === 1 && trip.expenses.length === 0;
}

function firstExpenseCta(trip: Trip): string {
  if (needsMembersBeforeFirstExpense(trip)) {
    return `
      <div class="empty-state">
        <h4>先新增同行成員</h4>
        <p class="muted">目前只有你自己。先把同行朋友加進來，下一筆支出才知道要分給誰。</p>
        <button class="secondary" data-workspace-tab="members" type="button">新增成員</button>
      </div>
    `;
  }

  return `
    <div class="empty-state">
      <h4>先記一筆或新增成員</h4>
      <p class="muted">有同行成員後，新增第一筆共同支出就會自動算出餘額。</p>
      <div class="row">
        <button data-workspace-tab="add-expense" type="button">新增第一筆支出</button>
        <button class="secondary" data-workspace-tab="members" type="button">新增成員</button>
      </div>
    </div>
  `;
}

function overviewPanel(payload: TripPayload): string {
  return `
    <article id="${workspacePanelId("overview")}" class="card stack results-card" data-workspace-panel="overview" role="tabpanel" aria-labelledby="${workspaceTabId("overview")}">
      ${payload.trip.expenses.length === 0 ? firstExpenseCta(payload.trip) : spendingCharts(payload.trip)}
      <section class="summary-section">
        <h3>分帳結果</h3>
        ${balanceList(payload.balances)}
      </section>
      <section class="summary-section">
        <h3>結清建議</h3>
        ${settlementList(payload)}
      </section>
      <section class="summary-section">
        <h3>最近支出</h3>
        ${recentExpenseList(payload.trip)}
      </section>
    </article>
  `;
}

function spendingCharts(trip: Trip): string {
  const summary = spendingSummary(trip);
  return `
    <section class="summary-section spending-charts" aria-label="花費圖表">
      <div class="summary-card total-spending">
        <span class="muted">總支出</span>
        <strong>${formatMinor(summary.totalMinor, trip.baseCurrency)}</strong>
      </div>
      ${barChart(
        "每日花費",
        summary.dailyTotals.map((item) => ({
          label: item.date,
          amountMinor: item.amountMinor,
        })),
        trip,
      )}
      ${barChart(
        "每人實付",
        summary.payerTotals.map((item) => ({
          label: item.name,
          amountMinor: item.amountMinor,
        })),
        trip,
      )}
      ${barChart(
        "分類占比",
        summary.categoryTotals.map((item) => ({
          label: item.category,
          amountMinor: item.amountMinor,
        })),
        trip,
      )}
    </section>
  `;
}

function barChart(
  title: string,
  rows: { amountMinor: number; label: string }[],
  trip: Trip,
): string {
  if (rows.length === 0) {
    return `
      <div class="chart-card">
        <h3>${htmlEscape(title)}</h3>
        <p class="muted">尚無資料可顯示。</p>
      </div>
    `;
  }
  const max = Math.max(...rows.map((row) => row.amountMinor), 1);
  return `
    <div class="chart-card">
      <h3>${htmlEscape(title)}</h3>
      <ul class="chart-bars">
        ${rows
          .map((row) => {
            const percent =
              row.amountMinor <= 0
                ? 0
                : Math.max(4, Math.round((row.amountMinor / max) * 100));
            return `
              <li>
                <span class="chart-label">${htmlEscape(row.label)}</span>
                <span class="chart-track"><span class="chart-fill" style="width: ${percent}%"></span></span>
                <span class="chart-value">${formatMinor(row.amountMinor, trip.baseCurrency)}</span>
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function membersPanel(trip: Trip): string {
  return `
    <article id="${workspacePanelId("members")}" class="card stack participants-card" data-workspace-panel="members" role="tabpanel" aria-labelledby="${workspaceTabId("members")}">
      <h3>成員</h3>
      <form id="participant-form">
        <label>名稱<input name="name" required maxlength="80" placeholder="朋友名字" /></label>
        <button data-busy-action="participant-add" data-busy-label="新增中…" type="submit">新增成員</button>
      </form>
      ${participantMergeForm(trip)}
      <ul class="list">${trip.participants
        .map((person) => {
          const deleteBlockReason = participantDeleteBlockReason(
            trip,
            person.id,
          );
          const deleteReasonId = `participant-delete-reason-${htmlEscape(person.id)}`;
          return `
            <li>
              <div class="row">
                <span>${htmlEscape(person.name)}</span>
                <details class="inline-confirm">
                  <summary>重新命名</summary>
                  <form data-rename-participant-form="${htmlEscape(person.id)}">
                    <label>新名稱<input name="name" required maxlength="80" value="${htmlEscape(person.name)}" /></label>
                    <button class="secondary" data-busy-action="participant-rename:${htmlEscape(person.id)}" data-busy-label="儲存中…" type="submit">儲存名稱</button>
                  </form>
                </details>
                ${
                  deleteBlockReason
                    ? `<button class="danger" disabled title="${htmlEscape(deleteBlockReason)}" type="button" aria-label="無法刪除 ${htmlEscape(person.name)}" aria-describedby="${deleteReasonId}">刪除</button><span id="${deleteReasonId}" class="muted">${htmlEscape(deleteBlockReason)}</span>`
                    : `<details class="inline-confirm"><summary>刪除</summary><form data-delete-participant-form="${htmlEscape(person.id)}"><p class="muted">刪除 ${htmlEscape(person.name)} 後無法復原。</p><button class="danger" data-busy-action="participant-delete:${htmlEscape(person.id)}" data-busy-label="刪除中…" type="submit" aria-label="確認刪除 ${htmlEscape(person.name)}">確認刪除</button></form></details>`
                }
              </div>
            </li>
          `;
        })
        .join("")}</ul>
    </article>
  `;
}

function participantMergeForm(trip: Trip): string {
  if (trip.participants.length < 2) {
    return "";
  }
  const options = trip.participants
    .map(
      (person) =>
        `<option value="${htmlEscape(person.id)}">${htmlEscape(person.name)}</option>`,
    )
    .join("");
  return `
    <form id="participant-merge-form" class="inline-tool">
      <h4>合併重複成員</h4>
      <div class="grid">
        <label>來源成員<select name="sourceParticipantId" required>${options}</select></label>
        <label>合併到<select name="targetParticipantId" required>${options}</select></label>
      </div>
      <p class="muted">會把來源成員的付款、分帳與結清紀錄移到目標成員，並刪除來源成員。</p>
      <label class="inline-check"><input name="confirmMerge" type="checkbox" required /> 我了解來源成員會被刪除。</label>
      <button class="secondary" data-busy-action="participant-merge" data-busy-label="合併中…" type="submit">合併成員</button>
    </form>
  `;
}

function formErrorHtml(state: AppState, target: string): string {
  if (state.formErrorTarget !== target || !state.formError) {
    return "";
  }
  return `<p id="${htmlEscape(target)}-error" class="form-error" role="alert" tabindex="-1">${htmlEscape(state.formError)}</p>`;
}

function formErrorAttributes(state: AppState, target: string): string {
  return state.formErrorTarget === target && state.formError
    ? ` aria-describedby="${htmlEscape(target)}-error" aria-invalid="true"`
    : "";
}

function addExpenseContent(state: AppState, trip: Trip): string {
  if (needsMembersBeforeFirstExpense(trip)) {
    return `
      <div class="empty-state">
        <h4>先新增同行成員</h4>
        <p class="muted">目前只有你自己。先把同行朋友加進來，下一筆支出才知道要分給誰。</p>
        <button class="secondary" data-workspace-tab="members" type="button">去新增成員</button>
      </div>
    `;
  }
  return expenseForm(state, trip);
}

function expenseForm(state: AppState, trip: Trip): string {
  if (trip.participants.length === 0) {
    return '<p class="muted">先新增參與者。</p>';
  }

  const defaults = defaultExpenseFormValues(trip);
  const errorTarget = "expense-form";
  const selectedSplitIds = new Set(defaults.participantIds);

  return `
    <form id="expense-form" data-form-error-target="${errorTarget}" novalidate${formErrorAttributes(state, errorTarget)}>
      ${formErrorHtml(state, errorTarget)}
      <label>描述<input name="description" required maxlength="120" placeholder="晚餐、飯店、車票" /></label>
      <div class="grid">
        <label>分類${categorySelect("category")}</label>
        <label>標籤<input name="tags" maxlength="249" placeholder="逗號分隔，例如 早餐,交通" /></label>
      </div>
      <div class="grid">
        <label>日期<input name="expenseDate" type="date" required value="${defaults.expenseDate}" /></label>
        <label>金額<input name="amount" inputmode="decimal" required placeholder="1000" /></label>
        <label>貨幣${currencySelect("currency", defaults.currency)}</label>
      </div>
      <label>付款人
        <select name="paidById" required>
          ${trip.participants.map((person) => `<option value="${htmlEscape(person.id)}" ${person.id === defaults.paidById ? "selected" : ""}>${htmlEscape(person.name)}</option>`).join("")}
        </select>
      </label>
      <fieldset class="split-fieldset">
        <legend>分帳參與者</legend>
        <div class="row split-tools">
          <button class="secondary" data-split-shortcut="all" type="button">全選</button>
          <button class="secondary" data-split-shortcut="none" type="button">清除</button>
          <span id="split-count" class="muted">${splitCountLabel(defaults.participantIds.length, trip.participants.length)}</span>
        </div>
        <label>分帳方式${splitModeSelect("equal")}</label>
        <p class="muted split-hint">平均分帳可留空；金額、比例或份數模式請在每位成員旁輸入值。</p>
        <div class="checks split-checks">
          ${trip.participants
            .map((person) => splitParticipantInput(person, selectedSplitIds))
            .join("")}
        </div>
      </fieldset>
      <button data-busy-action="expense-create" data-busy-label="記錄中…" type="submit">記錄支出</button>
    </form>
  `;
}

function currencySelect(name: string, selected: Currency): string {
  return `
    <select name="${name}">
      ${currencies
        .map(
          (currency) => `
            <option value="${currency}" ${currency === selected ? "selected" : ""}>
              ${currency} · ${currencyInfo[currency].label}
            </option>
          `,
        )
        .join("")}
    </select>
  `;
}

function splitModeSelect(selected: "equal" | "amount" | "ratio" | "shares") {
  const modes = [
    ["equal", "平均"],
    ["amount", "指定金額"],
    ["ratio", "比例"],
    ["shares", "份數"],
  ] as const;
  return `
    <select name="splitMode">
      ${modes
        .map(
          ([value, label]) =>
            `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`,
        )
        .join("")}
    </select>
  `;
}

function splitParticipantInput(
  person: { id: string; name: string },
  selectedSplitIds: Set<string>,
  value = "",
): string {
  return `
    <label>
      <span>
        <input name="participantIds" type="checkbox" value="${htmlEscape(person.id)}" ${selectedSplitIds.has(person.id) ? "checked" : ""} />
        ${htmlEscape(person.name)}
      </span>
      <input name="splitValue:${htmlEscape(person.id)}" inputmode="decimal" value="${htmlEscape(value)}" placeholder="金額 / 比例 / 份數" aria-label="${htmlEscape(person.name)} 分帳值" />
    </label>
  `;
}

function expenseFiltersForm(state: AppState, trip: Trip): string {
  const filters = state.expenseFilters;
  return `
    <form id="expense-filters" class="inline-tool expense-filters">
      <h4>搜尋與篩選</h4>
      <div class="grid">
        <label>關鍵字<input name="query" value="${htmlEscape(filters.query)}" placeholder="搜尋描述" /></label>
        <label>起日<input name="dateFrom" type="date" value="${htmlEscape(filters.dateFrom)}" /></label>
        <label>迄日<input name="dateTo" type="date" value="${htmlEscape(filters.dateTo)}" /></label>
        <label>付款人${participantSelect("paidById", trip, filters.paidById, "全部付款人")}</label>
        <label>分帳成員${participantSelect("participantId", trip, filters.participantId, "全部成員")}</label>
        <label>幣別${currencyFilterSelect(filters.currency)}</label>
        <label>分類${categorySelect("category", filters.category, "全部分類")}</label>
        <label>標籤<input name="tag" value="${htmlEscape(filters.tag)}" placeholder="標籤完全符合" /></label>
        <label>排序${expenseSortSelect(filters.sort)}</label>
      </div>
      <button class="secondary" data-clear-expense-filters type="button">清除篩選</button>
    </form>
  `;
}

function participantSelect(
  name: string,
  trip: Trip,
  selected: string,
  emptyLabel: string,
): string {
  return `
    <select name="${name}">
      <option value="">${emptyLabel}</option>
      ${trip.participants
        .map(
          (person) =>
            `<option value="${htmlEscape(person.id)}" ${person.id === selected ? "selected" : ""}>${htmlEscape(person.name)}</option>`,
        )
        .join("")}
    </select>
  `;
}

function categorySelect(
  name: string,
  selected = "其他",
  emptyLabel?: string,
): string {
  return `
    <select name="${name}">
      ${emptyLabel ? `<option value="">${emptyLabel}</option>` : ""}
      ${expenseCategories
        .map(
          (category) =>
            `<option value="${htmlEscape(category)}" ${category === selected ? "selected" : ""}>${htmlEscape(category)}</option>`,
        )
        .join("")}
    </select>
  `;
}

function currencyFilterSelect(selected: string): string {
  return `
    <select name="currency">
      <option value="">全部幣別</option>
      ${currencies
        .map(
          (currency) =>
            `<option value="${currency}" ${currency === selected ? "selected" : ""}>${currency}</option>`,
        )
        .join("")}
    </select>
  `;
}

function expenseSortSelect(selected: string): string {
  const options = [
    ["date-desc", "日期新到舊"],
    ["date-asc", "日期舊到新"],
    ["amount-desc", "金額大到小"],
    ["amount-asc", "金額小到大"],
  ] as const;
  return `
    <select name="sort">
      ${options
        .map(
          ([value, label]) =>
            `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`,
        )
        .join("")}
    </select>
  `;
}

function expenseList(state: AppState, trip: Trip): string {
  if (trip.expenses.length === 0) {
    if (needsMembersBeforeFirstExpense(trip)) {
      return `
        <div class="empty-state">
          <p class="muted">還沒有支出。</p>
          <button class="secondary" data-workspace-tab="members" type="button">新增成員</button>
        </div>
      `;
    }

    return `
      <div class="empty-state">
        <p class="muted">還沒有支出。</p>
        <button class="secondary" data-workspace-tab="add-expense" type="button">新增第一筆支出</button>
      </div>
    `;
  }

  const expenses = filterAndSortExpenses(trip, state.expenseFilters);
  if (expenses.length === 0) {
    return `
      <div class="empty-state">
        <p class="muted">沒有符合條件的支出。</p>
        <button class="secondary" data-clear-expense-filters type="button">清除篩選</button>
      </div>
    `;
  }

  const participantById = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  return `
    <p class="muted">顯示 ${expenses.length} / ${trip.expenses.length} 筆支出</p>
    <ul class="list">
      ${expenses
        .map(
          (expense) => `
            <li class="expense-item">
              <div class="row expense-row">
                <div class="expense-summary">
                  <strong>${htmlEscape(expense.description)}</strong><br />
                  ${htmlEscape(expense.expenseDate)} · ${formatMinor(expense.amountMinor, expense.currency)} · ${htmlEscape(participantById.get(expense.paidById) ?? "未知")} 付款<br />
                  <span class="muted">${htmlEscape(expenseMetaLabel(expense))}</span><br />
                  <span class="muted">分給 ${htmlEscape(expenseSplitLabel(trip, expense.participantIds))}</span>
                </div>
                <details class="inline-confirm">
                  <summary>刪除</summary>
                  <form data-delete-expense-form="${htmlEscape(expense.id)}">
                    <p class="muted">刪除 ${htmlEscape(expense.description)} 後會重新計算餘額。</p>
                    <button class="danger" data-busy-action="expense-delete:${htmlEscape(expense.id)}" data-busy-label="刪除中…" type="submit" aria-label="確認刪除 ${htmlEscape(expense.description)}">確認刪除</button>
                  </form>
                </details>
              </div>
              ${receiptControls(expense)}
              ${expenseEditForm(state, trip, expense)}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function receiptControls(expense: Expense): string {
  return `
    <div class="row receipt-controls">
      <form class="receipt-upload-form" data-receipt-upload-expense-id="${htmlEscape(expense.id)}">
        <label>收據照片<input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <button class="secondary" data-busy-action="receipt-upload:${htmlEscape(expense.id)}" data-busy-label="上傳中…" type="submit">上傳收據</button>
      </form>
      ${
        expense.receiptUrl
          ? `<a class="secondary button-link" href="${htmlEscape(expense.receiptUrl)}" target="_blank" rel="noreferrer">查看收據</a><details class="inline-confirm"><summary>刪除收據</summary><form data-delete-receipt-form="${htmlEscape(expense.id)}"><p class="muted">刪除後可再上傳新的收據。</p><button class="danger" data-busy-action="receipt-delete:${htmlEscape(expense.id)}" data-busy-label="刪除中…" type="submit">確認刪除收據</button></form></details>`
          : '<span class="muted">尚未上傳收據</span>'
      }
    </div>
  `;
}

function expenseMetaLabel(expense: Expense): string {
  const tags = expense.tags?.length ? ` · ${expense.tags.join("、")}` : "";
  return `${expense.category ?? "其他"}${tags}`;
}

function expenseEditForm(
  state: AppState,
  trip: Trip,
  expense: Expense,
): string {
  const errorTarget = `expense-edit-${expense.id}`;
  const hasError = state.formErrorTarget === errorTarget && !!state.formError;
  const splitIds = new Set(expense.participantIds);
  const shareByParticipant = new Map(
    expense.participantShares?.map((share) => [
      share.participantId,
      String(toMajor(share.shareMinor, expense.currency)),
    ]) ?? [],
  );
  const splitMode = shareByParticipant.size > 0 ? "amount" : "equal";

  return `
    <details class="expense-actions"${hasError ? " open" : ""}>
      <summary>編輯</summary>
      <form class="expense-edit-form" data-edit-expense-form="${htmlEscape(expense.id)}" data-form-error-target="${htmlEscape(errorTarget)}" novalidate${formErrorAttributes(state, errorTarget)}>
        ${formErrorHtml(state, errorTarget)}
        <div class="grid">
          <label>描述<input name="description" required maxlength="120" value="${htmlEscape(expense.description)}" /></label>
          <label>分類${categorySelect("category", expense.category ?? "其他")}</label>
          <label>標籤<input name="tags" maxlength="249" value="${htmlEscape((expense.tags ?? []).join(", "))}" /></label>
          <label>日期<input name="expenseDate" type="date" required value="${htmlEscape(expense.expenseDate)}" /></label>
          <label>金額<input name="amount" inputmode="decimal" required value="${htmlEscape(String(toMajor(expense.amountMinor, expense.currency)))}" /></label>
          <label>貨幣${currencySelect("currency", expense.currency)}</label>
          <label>付款人
            <select name="paidById" required>
              ${trip.participants.map((person) => `<option value="${htmlEscape(person.id)}" ${person.id === expense.paidById ? "selected" : ""}>${htmlEscape(person.name)}</option>`).join("")}
            </select>
          </label>
        </div>
        <fieldset class="split-fieldset">
          <legend>分帳參與者</legend>
          <label>分帳方式${splitModeSelect(splitMode)}</label>
          <p class="muted split-hint">平均分帳可留空；金額、比例或份數模式請在每位成員旁輸入值。</p>
          <div class="checks split-checks">
            ${trip.participants
              .map((person) =>
                splitParticipantInput(
                  person,
                  splitIds,
                  shareByParticipant.get(person.id) ?? "",
                ),
              )
              .join("")}
          </div>
        </fieldset>
        <div class="row form-actions">
          <button data-busy-action="expense-edit:${htmlEscape(expense.id)}" data-busy-label="儲存中…" type="submit">儲存</button>
          <button class="secondary" data-cancel-expense-edit type="button">取消</button>
        </div>
      </form>
    </details>
  `;
}

function readonlyExpenseList(trip: Trip): string {
  if (trip.expenses.length === 0) {
    return '<p class="muted">還沒有支出。</p>';
  }
  const participantById = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  return `
    <ul class="list">
      ${sortedExpenses(trip)
        .map(
          (expense) => `
            <li>
              <strong>${htmlEscape(expense.description)}</strong><br />
              ${htmlEscape(expense.expenseDate)} · ${formatMinor(expense.amountMinor, expense.currency)} · ${htmlEscape(participantById.get(expense.paidById) ?? "未知")} 付款<br />
              <span class="muted">${htmlEscape(expenseMetaLabel(expense))} · 分給 ${htmlEscape(expenseSplitLabel(trip, expense.participantIds))}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function recentExpenseList(trip: Trip): string {
  if (trip.expenses.length === 0) {
    return '<p class="muted">還沒有支出。</p>';
  }

  const participantById = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  return `
    <ul class="list">
      ${sortedExpenses(trip)
        .slice(0, 3)
        .map(
          (expense) => `
            <li>
              <strong>${htmlEscape(expense.description)}</strong><br />
              ${htmlEscape(expense.expenseDate)} · ${formatMinor(expense.amountMinor, expense.currency)} · ${htmlEscape(participantById.get(expense.paidById) ?? "未知")} 付款<br />
              <span class="muted">分給 ${htmlEscape(expenseSplitLabel(trip, expense.participantIds))}</span>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function sortedExpenses(trip: Trip) {
  return [...trip.expenses].sort(
    (left, right) =>
      right.expenseDate.localeCompare(left.expenseDate) ||
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );
}

function balanceList(balances: Balance[]): string {
  if (balances.length === 0) {
    return '<p class="muted">還沒有餘額。</p>';
  }

  return `
    <ul class="list">
      ${balances
        .map((balance) => {
          const className = balance.amountMinor >= 0 ? "positive" : "negative";
          const label = balance.amountMinor >= 0 ? "應收" : "應付";
          return `
            <li>
              ${htmlEscape(balance.name)}：
              <span class="${className}">${label} ${formatMinor(Math.abs(balance.amountMinor), balance.currency)}</span>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function readonlySettlementList(payload: TripPayload): string {
  const { settlements } = payload;
  if (settlements.length === 0) {
    return '<p class="muted">目前已經打平。</p>';
  }
  return `
    <ul class="list">
      ${settlements
        .map(
          (settlement) => `
            <li>
              ${htmlEscape(settlement.fromName)} 付給 ${htmlEscape(settlement.toName)}
              <strong>${formatMinor(settlement.amountMinor, settlement.currency)}</strong>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function settlementList(payload: TripPayload): string {
  const { settlements, trip } = payload;
  const history = settlementPaymentList(trip);
  if (settlements.length === 0) {
    return `<p class="muted">目前已經打平。</p>${history}`;
  }

  return `
    <ul class="list">
      ${settlements
        .map(
          (settlement) => `
            <li>
              <span class="settlement-summary">
                ${htmlEscape(settlement.fromName)} 付給 ${htmlEscape(settlement.toName)}
                <strong>${formatMinor(settlement.amountMinor, settlement.currency)}</strong>
              </span>
              <form class="settlement-payment-form" data-settlement-payment-form>
                <input name="fromId" type="hidden" value="${htmlEscape(settlement.fromId)}" />
                <input name="toId" type="hidden" value="${htmlEscape(settlement.toId)}" />
                <input name="amount" type="hidden" value="${htmlEscape(String(toMajor(settlement.amountMinor, settlement.currency)))}" />
                <input name="currency" type="hidden" value="${settlement.currency}" />
                <label>付款日期<input name="paidAt" type="date" required value="${todayDate()}" /></label>
                <input name="note" placeholder="付款備註（可空白）" maxlength="160" />
                <button class="secondary" data-busy-action="settlement-pay:${htmlEscape(settlement.fromId)}:${htmlEscape(settlement.toId)}" data-busy-label="記錄中…" type="submit">標記已付款</button>
              </form>
            </li>
          `,
        )
        .join("")}
    </ul>
    ${history}
  `;
}

function settlementPaymentList(trip: Trip): string {
  const payments = trip.settlementPayments ?? [];
  if (payments.length === 0) {
    return "";
  }
  const participantById = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  return `
    <section class="summary-section settlement-history">
      <h4>付款紀錄</h4>
      <ul class="list">
        ${payments
          .map(
            (payment) => `
              <li>
                ${htmlEscape(payment.paidAt)} · ${htmlEscape(participantById.get(payment.fromId) ?? "未知")} 已付給 ${htmlEscape(participantById.get(payment.toId) ?? "未知")}
                <strong>${formatMinor(payment.amountMinor, payment.currency)}</strong>
                ${payment.note ? `<span class="muted">${htmlEscape(payment.note)}</span>` : ""}
                <details class="inline-confirm">
                  <summary>刪除紀錄</summary>
                  <form data-delete-settlement-payment-form="${htmlEscape(payment.id)}">
                    <p class="muted">刪除後會重新計算剩餘結清建議。</p>
                    <button class="danger" data-busy-action="settlement-delete:${htmlEscape(payment.id)}" data-busy-label="刪除中…" type="submit">確認刪除</button>
                  </form>
                </details>
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}
