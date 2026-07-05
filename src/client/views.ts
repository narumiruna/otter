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
  splitCountLabel,
  type TripPayload,
  type TripSummary,
  type WorkspaceTab,
  workspaceTabs,
} from "./client-support.js";

function localDateOnly(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function authView(state: AppState): string {
  const devEmail = state.devAdmin?.email ?? "";
  const devPassword = state.devAdmin?.password ?? "";

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
        <form id="login-form">
          <label>Email<input name="email" type="email" autocomplete="email" value="${htmlEscape(devEmail)}" required /></label>
          <label>密碼<input name="password" type="password" autocomplete="current-password" value="${htmlEscape(devPassword)}" required /></label>
          <button type="submit">登入</button>
        </form>
      </article>
      <article class="card stack auth-card">
        <h2>註冊</h2>
        <form id="register-form">
          <label>名稱<input name="name" autocomplete="name" required maxlength="80" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" required /></label>
          <label>密碼<input name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
          <button type="submit">建立帳號</button>
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
            <button type="submit">新增支出群組</button>
          </form>
        </details>
      </aside>
      ${state.selected ? tripView(state) : '<section class="card empty-state"><h2>先選擇支出群組</h2><p class="muted">選擇或新增支出群組後開始記帳。</p></section>'}
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
    <button class="${active}" data-trip-id="${htmlEscape(trip.id)}" type="button" aria-pressed="${isActive}"${isActive ? ' aria-current="true"' : ""}>
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
      return settingsPanel(payload.trip);
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
      ${payload.trip.expenses.length === 0 ? firstExpenseCta(payload.trip) : ""}
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

function membersPanel(trip: Trip): string {
  return `
    <article id="${workspacePanelId("members")}" class="card stack participants-card" data-workspace-panel="members" role="tabpanel" aria-labelledby="${workspaceTabId("members")}">
      <h3>成員</h3>
      <form id="participant-form">
        <label>名稱<input name="name" required maxlength="80" placeholder="朋友名字" /></label>
        <button type="submit">新增成員</button>
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
                <button class="secondary" data-rename-participant-id="${htmlEscape(person.id)}" data-participant-name="${htmlEscape(person.name)}" type="button" aria-label="重新命名 ${htmlEscape(person.name)}">重新命名</button>
                ${
                  deleteBlockReason
                    ? `<button class="danger" disabled title="${htmlEscape(deleteBlockReason)}" type="button" aria-label="無法刪除 ${htmlEscape(person.name)}" aria-describedby="${deleteReasonId}">刪除</button><span id="${deleteReasonId}" class="muted">${htmlEscape(deleteBlockReason)}</span>`
                    : `<button class="danger" data-delete-participant-id="${htmlEscape(person.id)}" data-participant-name="${htmlEscape(person.name)}" type="button" aria-label="刪除 ${htmlEscape(person.name)}">刪除</button>`
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
      <button class="secondary" type="submit">合併成員</button>
    </form>
  `;
}

function settingsPanel(trip: Trip): string {
  return `
    <article id="${workspacePanelId("settings")}" class="card stack settings-card" data-workspace-panel="settings" role="tabpanel" aria-labelledby="${workspaceTabId("settings")}">
      <h3>設定 / 匯出</h3>
      <div class="action-groups" aria-label="支出群組操作">
        <div class="row action-group">
          <button id="export-expenses" class="secondary" type="button">匯出支出 CSV</button>
          <button id="export-results" class="secondary" type="button">匯出結算 CSV</button>
          <button id="print-trip" class="secondary" type="button">列印</button>
        </div>
        <div class="row action-group">
          <button id="edit-trip-base-currency" class="secondary" type="button">改基準貨幣</button>
          <button id="rename-trip" class="secondary" type="button">重新命名</button>
        </div>
        <div class="row danger-actions">
          <button id="archive-trip" class="secondary" data-archived="${trip.archivedAt ? "true" : "false"}" type="button">${trip.archivedAt ? "還原支出群組" : "封存支出群組"}</button>
          <button id="delete-trip" class="danger" type="button">刪除支出群組</button>
        </div>
      </div>
      <p class="muted">目前基準貨幣：${trip.baseCurrency}${trip.archivedAt ? "；此群組已封存，還原後可繼續修改。" : ""}</p>
      ${trip.archivedAt ? "" : exchangeRatesForm(trip)}
    </article>
  `;
}

function exchangeRatesForm(trip: Trip): string {
  return `
    <form id="exchange-rates-form" class="inline-tool">
      <h4>自訂匯率</h4>
      <p class="muted">設定 1 單位外幣等於多少 ${trip.baseCurrency}；會套用於整趟旅行目前計算。</p>
      <div class="grid">
        ${currencies
          .map((currency) => {
            const rate =
              currency === trip.baseCurrency
                ? 1
                : trip.exchangeRates?.[currency];
            return `
              <label>${currency} → ${trip.baseCurrency}
                <input name="rate:${currency}" inputmode="decimal" value="${htmlEscape(String(rate ?? ""))}" ${currency === trip.baseCurrency ? "readonly" : ""} placeholder="留空使用內建匯率" />
              </label>
            `;
          })
          .join("")}
      </div>
      <button class="secondary" type="submit">儲存匯率</button>
    </form>
  `;
}

function formErrorHtml(state: AppState, target: string): string {
  if (state.formErrorTarget !== target || !state.formError) {
    return "";
  }
  return `<p id="${htmlEscape(target)}-error" class="form-error" role="alert">${htmlEscape(state.formError)}</p>`;
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
      <button type="submit">記錄支出</button>
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
                  <span class="muted">分給 ${htmlEscape(expenseSplitLabel(trip, expense.participantIds))}</span>
                </div>
                <button class="secondary" data-delete-expense-id="${htmlEscape(expense.id)}" data-expense-description="${htmlEscape(expense.description)}" type="button" aria-label="刪除 ${htmlEscape(expense.description)}">刪除</button>
              </div>
              ${expenseEditForm(state, trip, expense)}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
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
          <button type="submit">儲存</button>
          <button class="secondary" data-cancel-expense-edit type="button">取消</button>
        </div>
      </form>
    </details>
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
                <label>付款日期<input name="paidAt" type="date" required value="${localDateOnly()}" /></label>
                <input name="note" placeholder="付款備註（可空白）" maxlength="160" />
                <button class="secondary" type="submit">標記已付款</button>
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
                <button class="secondary" data-delete-settlement-payment-id="${htmlEscape(payment.id)}" type="button">刪除紀錄</button>
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}
