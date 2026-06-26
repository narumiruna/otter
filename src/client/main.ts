import "./styles.css";
import { tripExpensesCsv, tripResultsCsv } from "../shared/csv.js";
import {
  type Currency,
  currencies,
  currencyInfo,
  formatMinor,
  isCurrency,
  toMajor,
} from "../shared/money.js";
import type { Balance, Settlement, Trip } from "../shared/settlement.js";
import {
  type AppState,
  api,
  type DevAdmin,
  downloadText,
  htmlEscape,
  safeFilename,
  type TripPayload,
  type TripSummary,
  todayDate,
  type User,
} from "./client-support.js";

const state: AppState = {
  devAdmin: null,
  error: "",
  message: "",
  selected: null,
  trips: [],
  user: null,
};

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) {
  throw new Error("Missing #app");
}
const app = appElement;

function setMessage(message: string, error = "") {
  state.message = message;
  state.error = error;
}

async function run(action: () => Promise<void>) {
  try {
    setMessage("", "");
    await action();
  } catch (error) {
    setMessage("", error instanceof Error ? error.message : "發生錯誤");
  } finally {
    render();
  }
}

async function init() {
  await run(async () => {
    const me = await api<{ devAdmin?: DevAdmin | null; user: User | null }>(
      "/api/me",
    );
    state.devAdmin = me.devAdmin ?? null;
    state.user = me.user;
    if (state.user) {
      await loadTrips();
    }
  });
}

async function loadTrips() {
  const data = await api<{ trips: TripSummary[] }>("/api/trips");
  state.trips = data.trips;
  if (!state.selected && state.trips[0]) {
    await selectTrip(state.trips[0].id);
  }
}

async function selectTrip(tripId: string) {
  state.selected = await api<TripPayload>(`/api/trips/${tripId}`);
}

function render() {
  app.innerHTML = `
    <main class="app">
      <section class="hero">
        <div>
          <h1>otter</h1>
          <p class="muted">旅行和朋友聚會的 TypeScript 記帳拆帳 app</p>
        </div>
        ${
          state.user
            ? `<div class="row"><span>${htmlEscape(state.user.name)}</span><button id="logout" class="secondary">登出</button></div>`
            : ""
        }
      </section>
      ${state.message ? `<p class="notice">${htmlEscape(state.message)}</p>` : ""}
      ${state.error ? `<p class="error">${htmlEscape(state.error)}</p>` : ""}
      ${state.user ? dashboardView() : authView()}
    </main>
  `;
  bindHandlers();
}

function authView(): string {
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

function dashboardView(): string {
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
              ? state.trips.map(tripButton).join("")
              : '<p class="muted">還沒有旅行，先新增一個。</p>'
          }
        </div>
      </aside>
      ${state.selected ? tripView(state.selected) : '<section class="card"><p class="muted">選擇或新增旅行後開始記帳。</p></section>'}
    </section>
  `;
}

function tripButton(trip: TripSummary): string {
  const active = state.selected?.trip.id === trip.id ? " active" : "";
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
            .map(
              (person) => `
                <li>
                  <div class="row">
                    <span>${htmlEscape(person.name)}</span>
                    <button class="secondary" data-rename-participant-id="${htmlEscape(person.id)}" data-participant-name="${htmlEscape(person.name)}" type="button">重新命名</button>
                    <button class="danger" data-delete-participant-id="${htmlEscape(person.id)}" data-participant-name="${htmlEscape(person.name)}" type="button">刪除</button>
                  </div>
                </li>
              `,
            )
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
        <strong>分帳參與者</strong>
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
                  <span class="muted">分給 ${expense.participantIds
                    .map((id) => htmlEscape(participantById.get(id) ?? "未知"))
                    .join("、")}</span>
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

function bindHandlers() {
  document
    .querySelector<HTMLFormElement>("#login-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget as HTMLFormElement);
      void run(async () => {
        const data = await api<{ user: User }>("/api/auth/login", {
          body: JSON.stringify({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          }),
          method: "POST",
        });
        state.user = data.user;
        state.selected = null;
        await loadTrips();
        setMessage("登入成功");
      });
    });

  document
    .querySelector<HTMLFormElement>("#register-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget as HTMLFormElement);
      void run(async () => {
        const data = await api<{ user: User }>("/api/auth/register", {
          body: JSON.stringify({
            email: String(form.get("email") ?? ""),
            name: String(form.get("name") ?? ""),
            password: String(form.get("password") ?? ""),
          }),
          method: "POST",
        });
        state.user = data.user;
        state.selected = null;
        await loadTrips();
        setMessage("註冊成功");
      });
    });

  document
    .querySelector<HTMLButtonElement>("#logout")
    ?.addEventListener("click", () => {
      void run(async () => {
        await api<{ ok: true }>("/api/auth/logout", { method: "POST" });
        state.user = null;
        state.trips = [];
        state.selected = null;
        setMessage("已登出");
      });
    });

  document
    .querySelector<HTMLFormElement>("#trip-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget as HTMLFormElement);
      void run(async () => {
        state.selected = await api<TripPayload>("/api/trips", {
          body: JSON.stringify({
            baseCurrency: String(form.get("baseCurrency") ?? "TWD"),
            name: String(form.get("name") ?? ""),
          }),
          method: "POST",
        });
        await loadTrips();
        setMessage("已新增旅行");
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-trip-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = button.dataset.tripId;
        if (!tripId) {
          return;
        }
        void run(async () => {
          await selectTrip(tripId);
        });
      });
    });

  document
    .querySelector<HTMLButtonElement>("#export-expenses")
    ?.addEventListener("click", () => {
      const trip = state.selected?.trip;
      if (!trip) {
        return;
      }
      downloadText(
        `${safeFilename(trip.name)}-expenses.csv`,
        tripExpensesCsv(trip),
      );
      setMessage("已匯出支出 CSV");
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#export-results")
    ?.addEventListener("click", () => {
      const selected = state.selected;
      if (!selected) {
        return;
      }
      downloadText(
        `${safeFilename(selected.trip.name)}-results.csv`,
        tripResultsCsv(selected.balances, selected.settlements),
      );
      setMessage("已匯出結算 CSV");
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#rename-trip")
    ?.addEventListener("click", () => {
      const tripId = state.selected?.trip.id;
      const name = prompt("新的旅行名稱", state.selected?.trip.name ?? "");
      if (!tripId || name === null) {
        return;
      }

      void run(async () => {
        state.selected = await api<TripPayload>(`/api/trips/${tripId}`, {
          body: JSON.stringify({ name }),
          method: "PATCH",
        });
        await loadTrips();
        setMessage("已更新旅行名稱");
      });
    });

  document
    .querySelector<HTMLButtonElement>("#edit-trip-base-currency")
    ?.addEventListener("click", () => {
      const tripId = state.selected?.trip.id;
      const currentCurrency = state.selected?.trip.baseCurrency ?? "TWD";
      const choice = prompt(
        `新的基準貨幣編號：\n${currencies.map((currency, index) => `${index + 1}. ${currency} · ${currencyInfo[currency].label}`).join("\n")}`,
        String(currencies.indexOf(currentCurrency) + 1 || 1),
      );
      if (!tripId || choice === null) {
        return;
      }

      void run(async () => {
        const baseCurrency = currencies[Number(choice) - 1];
        if (!baseCurrency) {
          throw new Error("請輸入有效基準貨幣編號");
        }
        state.selected = await api<TripPayload>(`/api/trips/${tripId}`, {
          body: JSON.stringify({ baseCurrency }),
          method: "PATCH",
        });
        await loadTrips();
        setMessage("已更新基準貨幣");
      });
    });

  document
    .querySelector<HTMLButtonElement>("#delete-trip")
    ?.addEventListener("click", () => {
      const tripId = state.selected?.trip.id;
      if (
        !tripId ||
        !confirm("確定要刪除這趟旅行？所有參與者和支出都會刪除。")
      ) {
        return;
      }

      void run(async () => {
        await api<{ ok: true }>(`/api/trips/${tripId}`, { method: "DELETE" });
        state.selected = null;
        await loadTrips();
        setMessage("已刪除旅行");
      });
    });

  document
    .querySelector<HTMLFormElement>("#participant-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const tripId = state.selected?.trip.id;
      if (!tripId) {
        return;
      }
      const form = new FormData(event.currentTarget as HTMLFormElement);
      void run(async () => {
        state.selected = await api<TripPayload>(
          `/api/trips/${tripId}/participants`,
          {
            body: JSON.stringify({ name: String(form.get("name") ?? "") }),
            method: "POST",
          },
        );
        await loadTrips();
        setMessage("已新增參與者");
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-rename-participant-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const participantId = button.dataset.renameParticipantId;
        const name = prompt(
          "新的參與者名稱",
          button.dataset.participantName ?? "",
        );
        if (!tripId || !participantId || name === null) {
          return;
        }

        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/participants/${participantId}`,
            {
              body: JSON.stringify({ name }),
              method: "PATCH",
            },
          );
          setMessage("已更新參與者名稱");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-participant-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const participantId = button.dataset.deleteParticipantId;
        const name = button.dataset.participantName ?? "這位參與者";
        if (!tripId || !participantId || !confirm(`刪除 ${name}？`)) {
          return;
        }

        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/participants/${participantId}`,
            { method: "DELETE" },
          );
          await loadTrips();
          setMessage("已刪除參與者");
        });
      });
    });

  document
    .querySelector<HTMLFormElement>("#expense-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const tripId = state.selected?.trip.id;
      if (!tripId) {
        return;
      }
      const formElement = event.currentTarget as HTMLFormElement;
      const form = new FormData(formElement);
      const participantIds = Array.from(
        formElement.querySelectorAll<HTMLInputElement>(
          'input[name="participantIds"]:checked',
        ),
      ).map((input) => input.value);

      void run(async () => {
        state.selected = await api<TripPayload>(
          `/api/trips/${tripId}/expenses`,
          {
            body: JSON.stringify({
              amount: String(form.get("amount") ?? ""),
              currency: String(form.get("currency") ?? "TWD"),
              description: String(form.get("description") ?? ""),
              expenseDate: String(form.get("expenseDate") ?? ""),
              paidById: String(form.get("paidById") ?? ""),
              participantIds,
            }),
            method: "POST",
          },
        );
        await loadTrips();
        setMessage("已記錄支出");
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-expense-date-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.editExpenseDateId;
        const expenseDate = prompt(
          "新的支出日期 (YYYY-MM-DD)",
          button.dataset.expenseDate ?? "",
        );
        if (!tripId || !expenseId || expenseDate === null) {
          return;
        }

        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            {
              body: JSON.stringify({ expenseDate }),
              method: "PATCH",
            },
          );
          setMessage("已更新支出日期");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-expense-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.editExpenseId;
        const description = prompt(
          "新的支出描述",
          button.dataset.expenseDescription ?? "",
        );
        if (!tripId || !expenseId || description === null) {
          return;
        }

        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            {
              body: JSON.stringify({ description }),
              method: "PATCH",
            },
          );
          setMessage("已更新支出描述");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-expense-amount-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.editExpenseAmountId;
        const amount = prompt(
          "新的支出金額",
          button.dataset.expenseAmount ?? "",
        );
        if (!tripId || !expenseId || amount === null) {
          return;
        }

        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            {
              body: JSON.stringify({ amount }),
              method: "PATCH",
            },
          );
          setMessage("已更新支出金額");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-expense-currency-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.editExpenseCurrencyId;
        const currentCurrency = button.dataset.expenseCurrency;
        const currentIndex = isCurrency(currentCurrency)
          ? currencies.indexOf(currentCurrency)
          : 0;
        const choice = prompt(
          `新的貨幣編號：\n${currencies.map((currency, index) => `${index + 1}. ${currency} · ${currencyInfo[currency].label}`).join("\n")}`,
          String(currentIndex + 1 || 1),
        );
        if (!tripId || !expenseId || choice === null) {
          return;
        }

        void run(async () => {
          const currency = currencies[Number(choice) - 1];
          if (!currency) {
            throw new Error("請輸入有效貨幣編號");
          }
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            {
              body: JSON.stringify({ currency }),
              method: "PATCH",
            },
          );
          setMessage("已更新支出貨幣");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-expense-payer-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.editExpensePayerId;
        const participants = state.selected?.trip.participants ?? [];
        const currentIndex = participants.findIndex(
          (person) => person.id === button.dataset.expensePaidById,
        );
        const choice = prompt(
          `新的付款人編號：\n${participants.map((person, index) => `${index + 1}. ${person.name}`).join("\n")}`,
          String(currentIndex + 1 || 1),
        );
        if (!tripId || !expenseId || choice === null) {
          return;
        }

        void run(async () => {
          const payer = participants[Number(choice) - 1];
          if (!payer) {
            throw new Error("請輸入有效付款人編號");
          }
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            {
              body: JSON.stringify({ paidById: payer.id }),
              method: "PATCH",
            },
          );
          setMessage("已更新付款人");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-edit-expense-split-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.editExpenseSplitId;
        const participants = state.selected?.trip.participants ?? [];
        const expense = state.selected?.trip.expenses.find(
          (item) => item.id === expenseId,
        );
        const currentChoices =
          expense?.participantIds
            .map((id) => participants.findIndex((person) => person.id === id))
            .filter((index) => index >= 0)
            .map((index) => String(index + 1))
            .join(",") ?? "";
        const choice = prompt(
          `新的分帳參與者編號（逗號分隔）：\n${participants.map((person, index) => `${index + 1}. ${person.name}`).join("\n")}`,
          currentChoices,
        );
        if (!tripId || !expenseId || choice === null) {
          return;
        }

        void run(async () => {
          const participantIds: string[] = [];
          for (const text of new Set(
            choice.split(/[\s,，]+/).filter(Boolean),
          )) {
            const participant = participants[Number(text) - 1];
            if (!participant) {
              throw new Error("請輸入有效分帳參與者編號");
            }
            participantIds.push(participant.id);
          }
          if (participantIds.length === 0) {
            throw new Error("請至少選擇一位分帳參與者");
          }
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            {
              body: JSON.stringify({ participantIds }),
              method: "PATCH",
            },
          );
          setMessage("已更新分帳參與者");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-expense-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const expenseId = button.dataset.deleteExpenseId;
        const description = button.dataset.expenseDescription ?? "這筆支出";
        if (!tripId || !expenseId || !confirm(`刪除 ${description}？`)) {
          return;
        }

        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses/${expenseId}`,
            { method: "DELETE" },
          );
          await loadTrips();
          setMessage("已刪除支出");
        });
      });
    });
}

void init();
