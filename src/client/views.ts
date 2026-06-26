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
    <section class="grid">
      <aside class="card stack">
        <h2>旅行 / 群組</h2>
        <form id="trip-form">
          <label>名稱<input name="name" required maxlength="100" placeholder="東京五日遊" /></label>
          <label>基準貨幣${currencySelect("baseCurrency", "TWD")}</label>
          <button type="submit">新增旅行</button>
        </form>
        <div class="trip-list stack">
          ${
            state.trips.length
              ? state.trips
                  .map((trip) => tripButton(trip, state.selected?.trip.id))
                  .join("")
              : '<p class="muted">還沒有旅行，先新增一個。</p>'
          }
        </div>
      </aside>
      ${state.selected ? tripView(state.selected) : '<section class="card"><p class="muted">選擇或新增旅行後開始記帳。</p></section>'}
    </section>
  `;
}

function tripButton(trip: TripSummary, selectedTripId?: string): string {
  const active = selectedTripId === trip.id ? " active" : "";
  return `
    <button class="${active}" data-trip-id="${htmlEscape(trip.id)}" type="button">
      <strong>${htmlEscape(trip.name)}</strong><br />
      <span class="muted">${trip.participantCount} 人 · ${trip.expenseCount} 筆 · ${trip.baseCurrency}</span>
    </button>
  `;
}

function tripView(payload: TripPayload): string {
  const { trip } = payload;
  return `
    <section class="stack">
      <article class="card stack">
        <div class="row">
          <h2>${htmlEscape(trip.name)}</h2>
          <button id="export-expenses" class="secondary" type="button">匯出支出 CSV</button>
          <button id="export-results" class="secondary" type="button">匯出結算 CSV</button>
          <button id="print-trip" class="secondary" type="button">列印</button>
          <button id="edit-trip-base-currency" class="secondary" type="button">改基準貨幣</button>
          <button id="rename-trip" class="secondary" type="button">重新命名</button>
          <button id="delete-trip" class="danger" type="button">刪除旅行</button>
        </div>
        <p class="muted">基準貨幣：${trip.baseCurrency}。匯率目前使用固定原型值，可之後改接即時匯率。</p>
      </article>
      <div class="grid">
        <article class="card stack">
          <h3>參與者</h3>
          <form id="participant-form">
            <label>名稱<input name="name" required maxlength="80" placeholder="朋友名字" /></label>
            <button type="submit">新增參與者</button>
          </form>
          <ul class="list">${trip.participants
            .map((person) => {
              const deleteBlockReason = participantDeleteBlockReason(
                trip,
                person.id,
              );
              return `
                <li>
                  <div class="row">
                    <span>${htmlEscape(person.name)}</span>
                    <button class="secondary" data-rename-participant-id="${htmlEscape(person.id)}" data-participant-name="${htmlEscape(person.name)}" type="button">重新命名</button>
                    ${
                      deleteBlockReason
                        ? `<button class="danger" disabled title="${htmlEscape(deleteBlockReason)}" type="button">刪除</button><span class="muted">${htmlEscape(deleteBlockReason)}</span>`
                        : `<button class="danger" data-delete-participant-id="${htmlEscape(person.id)}" data-participant-name="${htmlEscape(person.name)}" type="button">刪除</button>`
                    }
                  </div>
                </li>
              `;
            })
            .join("")}</ul>
        </article>
        <article class="card stack">
          <h3>新增支出</h3>
          ${expenseForm(trip)}
        </article>
      </div>
      <div class="grid">
        <article class="card stack">
          <h3>支出紀錄</h3>
          ${expenseList(trip)}
        </article>
        <article class="card stack">
          <h3>分帳結果</h3>
          ${balanceList(payload.balances)}
          <h3>結清建議</h3>
          ${settlementList(payload.settlements)}
        </article>
      </div>
    </section>
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
      ${[...trip.expenses]
        .reverse()
        .map(
          (expense) => `
            <li>
              <div class="row">
                <div>
                  <strong>${htmlEscape(expense.description)}</strong><br />
                  ${htmlEscape(expense.expenseDate)} · ${formatMinor(expense.amountMinor, expense.currency)} · ${htmlEscape(participantById.get(expense.paidById) ?? "未知")} 付款<br />
                  <span class="muted">分給 ${htmlEscape(expenseSplitLabel(trip, expense.participantIds))}</span>
                </div>
                <button class="secondary" data-edit-expense-date-id="${htmlEscape(expense.id)}" data-expense-date="${htmlEscape(expense.expenseDate)}" type="button">改日期</button>
                <button class="secondary" data-edit-expense-id="${htmlEscape(expense.id)}" data-expense-description="${htmlEscape(expense.description)}" type="button">改描述</button>
                <button class="secondary" data-edit-expense-amount-id="${htmlEscape(expense.id)}" data-expense-amount="${htmlEscape(String(toMajor(expense.amountMinor, expense.currency)))}" type="button">改金額</button>
                <button class="secondary" data-edit-expense-currency-id="${htmlEscape(expense.id)}" data-expense-currency="${expense.currency}" type="button">改貨幣</button>
                <button class="secondary" data-edit-expense-payer-id="${htmlEscape(expense.id)}" data-expense-paid-by-id="${htmlEscape(expense.paidById)}" type="button">改付款人</button>
                <button class="secondary" data-edit-expense-split-id="${htmlEscape(expense.id)}" type="button">改分帳</button>
                <button class="secondary" data-delete-expense-id="${htmlEscape(expense.id)}" data-expense-description="${htmlEscape(expense.description)}" type="button">刪除</button>
              </div>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
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
