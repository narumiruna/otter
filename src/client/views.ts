import {
  type Currency,
  currencies,
  currencyInfo,
  formatMinor,
  toMajor,
} from "../shared/money.js";
import type { Balance, Settlement, Trip } from "../shared/settlement.js";
import {
  type AppState,
  expenseSplitLabel,
  htmlEscape,
  participantDeleteBlockReason,
  splitCountLabel,
  type TripPayload,
  type TripSummary,
  todayDate,
  type WorkspaceTab,
  workspaceTabs,
} from "./client-support.js";

export function authView(state: AppState): string {
  const devEmail = state.devAdmin?.email ?? "";
  const devPassword = state.devAdmin?.password ?? "";

  return `
    <section class="grid">
      <article class="card stack">
        <h2>登入</h2>
        <form id="login-form">
          <label>Email<input name="email" type="email" autocomplete="email" value="${htmlEscape(devEmail)}" required /></label>
          <label>密碼<input name="password" type="password" autocomplete="current-password" value="${htmlEscape(devPassword)}" required /></label>
          <button type="submit">登入</button>
        </form>
      </article>
      <article class="card stack">
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
        <details class="trip-create" ${state.trips.length ? "" : "open"}>
          <summary>新增支出群組</summary>
          <form id="trip-form">
            <label>名稱<input name="name" required maxlength="100" placeholder="東京五日遊" /></label>
            <label>基準貨幣${currencySelect("baseCurrency", "TWD")}</label>
            <button type="submit">新增支出群組</button>
          </form>
        </details>
      </aside>
      ${state.selected ? tripView(state.selected, state.activeTab) : '<section class="card"><p class="muted">選擇或新增支出群組後開始記帳。</p></section>'}
    </section>
  `;
}

function tripButton(trip: TripSummary, selectedTripId?: string): string {
  const isActive = selectedTripId === trip.id;
  const active = isActive ? " active" : "";
  return `
    <button class="${active}" data-trip-id="${htmlEscape(trip.id)}" type="button" aria-pressed="${isActive}">
      <strong>${htmlEscape(trip.name)}</strong><br />
      <span class="muted">${trip.participantCount} 人 · ${trip.expenseCount} 筆 · ${trip.baseCurrency}</span>
    </button>
  `;
}

function tripView(payload: TripPayload, activeTab: WorkspaceTab): string {
  const { trip } = payload;
  return `
    <section class="stack trip-detail">
      <article class="card stack trip-summary">
        <div class="trip-title">
          <h2>${htmlEscape(trip.name)}</h2>
          <p class="muted">基準貨幣：${trip.baseCurrency}。匯率目前使用固定原型值，可之後改接即時匯率。</p>
        </div>
        ${workspaceTabBar(activeTab)}
      </article>
      ${workspacePanel(payload, activeTab)}
    </section>
  `;
}

function workspaceTabBar(activeTab: WorkspaceTab): string {
  return `
    <nav class="workspace-tabs" aria-label="支出群組工作區" role="tablist">
      ${workspaceTabs
        .map((tab) => {
          const active = tab === activeTab;
          return `
            <button class="secondary${active ? " active" : ""}" data-workspace-tab="${tab}" type="button" role="tab" aria-selected="${active}">
              ${workspaceTabLabel(tab)}
            </button>
          `;
        })
        .join("")}
    </nav>
  `;
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

function workspacePanel(payload: TripPayload, activeTab: WorkspaceTab): string {
  switch (activeTab) {
    case "overview":
      return overviewPanel(payload);
    case "add-expense":
      return `
        <article class="card stack expense-create-card" data-workspace-panel="add-expense">
          <h3>記帳</h3>
          ${expenseForm(payload.trip)}
        </article>
      `;
    case "expenses":
      return `
        <article class="card stack expense-list-card" data-workspace-panel="expenses">
          <h3>支出紀錄</h3>
          ${expenseList(payload.trip)}
        </article>
      `;
    case "members":
      return membersPanel(payload.trip);
    case "settings":
      return settingsPanel(payload.trip);
  }
}

function overviewPanel(payload: TripPayload): string {
  return `
    <article class="card stack results-card" data-workspace-panel="overview">
      <h3>分帳結果</h3>
      ${balanceList(payload.balances)}
      <h3>結清建議</h3>
      ${settlementList(payload.settlements)}
      <h3>最近支出</h3>
      ${recentExpenseList(payload.trip)}
    </article>
  `;
}

function membersPanel(trip: Trip): string {
  return `
    <article class="card stack participants-card" data-workspace-panel="members">
      <h3>成員</h3>
      <form id="participant-form">
        <label>名稱<input name="name" required maxlength="80" placeholder="朋友名字" /></label>
        <button type="submit">新增成員</button>
      </form>
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

function settingsPanel(trip: Trip): string {
  return `
    <article class="card stack settings-card" data-workspace-panel="settings">
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
          <button id="delete-trip" class="danger" type="button">刪除支出群組</button>
        </div>
      </div>
      <p class="muted">目前基準貨幣：${trip.baseCurrency}</p>
    </article>
  `;
}

function expenseForm(trip: Trip): string {
  if (trip.participants.length === 0) {
    return '<p class="muted">先新增參與者。</p>';
  }

  return `
    <form id="expense-form">
      <label>描述<input name="description" required maxlength="120" placeholder="晚餐、飯店、車票" /></label>
      <div class="grid">
        <label>日期<input name="expenseDate" type="date" required value="${todayDate()}" /></label>
        <label>金額<input name="amount" inputmode="decimal" required placeholder="1000" /></label>
        <label>貨幣${currencySelect("currency", trip.baseCurrency)}</label>
      </div>
      <label>付款人
        <select name="paidById" required>
          ${trip.participants.map((person) => `<option value="${htmlEscape(person.id)}">${htmlEscape(person.name)}</option>`).join("")}
        </select>
      </label>
      <div>
        <div class="row">
          <strong>分帳參與者</strong>
          <button class="secondary" data-split-shortcut="all" type="button">全選</button>
          <button class="secondary" data-split-shortcut="none" type="button">清除</button>
          <span id="split-count" class="muted">${splitCountLabel(trip.participants.length, trip.participants.length)}</span>
        </div>
        <div class="checks">
          ${trip.participants
            .map(
              (person) => `
                <label>
                  <input name="participantIds" type="checkbox" value="${htmlEscape(person.id)}" checked />
                  ${htmlEscape(person.name)}
                </label>
              `,
            )
            .join("")}
        </div>
      </div>
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

function expenseList(trip: Trip): string {
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
            <li class="expense-item">
              <div class="row expense-row">
                <div class="expense-summary">
                  <strong>${htmlEscape(expense.description)}</strong><br />
                  ${htmlEscape(expense.expenseDate)} · ${formatMinor(expense.amountMinor, expense.currency)} · ${htmlEscape(participantById.get(expense.paidById) ?? "未知")} 付款<br />
                  <span class="muted">分給 ${htmlEscape(expenseSplitLabel(trip, expense.participantIds))}</span>
                </div>
                <button class="secondary" data-delete-expense-id="${htmlEscape(expense.id)}" data-expense-description="${htmlEscape(expense.description)}" type="button" aria-label="刪除 ${htmlEscape(expense.description)}">刪除</button>
              </div>
              <details class="expense-actions">
                <summary>更多操作</summary>
                <div class="row">
                  <button class="secondary" data-edit-expense-date-id="${htmlEscape(expense.id)}" data-expense-date="${htmlEscape(expense.expenseDate)}" type="button" aria-label="修改 ${htmlEscape(expense.description)} 日期">改日期</button>
                  <button class="secondary" data-edit-expense-id="${htmlEscape(expense.id)}" data-expense-description="${htmlEscape(expense.description)}" type="button" aria-label="修改 ${htmlEscape(expense.description)} 描述">改描述</button>
                  <button class="secondary" data-edit-expense-amount-id="${htmlEscape(expense.id)}" data-expense-amount="${htmlEscape(String(toMajor(expense.amountMinor, expense.currency)))}" type="button" aria-label="修改 ${htmlEscape(expense.description)} 金額">改金額</button>
                  <button class="secondary" data-edit-expense-currency-id="${htmlEscape(expense.id)}" data-expense-currency="${expense.currency}" type="button" aria-label="修改 ${htmlEscape(expense.description)} 貨幣">改貨幣</button>
                  <button class="secondary" data-edit-expense-payer-id="${htmlEscape(expense.id)}" data-expense-paid-by-id="${htmlEscape(expense.paidById)}" type="button" aria-label="修改 ${htmlEscape(expense.description)} 付款人">改付款人</button>
                  <button class="secondary" data-edit-expense-split-id="${htmlEscape(expense.id)}" type="button" aria-label="修改 ${htmlEscape(expense.description)} 分帳參與者">改分帳</button>
                </div>
              </details>
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

function settlementList(settlements: Settlement[]): string {
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
