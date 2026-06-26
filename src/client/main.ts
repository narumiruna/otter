import "./styles.css";
import { tripExpensesCsv, tripResultsCsv } from "../shared/csv.js";
import { currencies, currencyInfo, isCurrency } from "../shared/money.js";
import {
  type AppState,
  api,
  type DevAdmin,
  downloadText,
  htmlEscape,
  safeFilename,
  splitCountLabel,
  splitSelectionError,
  splitShortcutChecked,
  type TripPayload,
  type TripSummary,
  type User,
} from "./client-support.js";
import { authView, dashboardView } from "./views.js";

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
      ${state.message ? `<p class="notice" role="status" aria-live="polite">${htmlEscape(state.message)}</p>` : ""}
      ${state.error ? `<p class="error" role="alert">${htmlEscape(state.error)}</p>` : ""}
      ${state.user ? dashboardView(state) : authView(state)}
    </main>
  `;
  bindHandlers();
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
    .querySelector<HTMLButtonElement>("#print-trip")
    ?.addEventListener("click", () => {
      window.print();
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

  const updateSplitCount = () => {
    const splitInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        '#expense-form input[name="participantIds"]',
      ),
    );
    const splitCount = document.querySelector<HTMLSpanElement>("#split-count");
    if (splitCount) {
      splitCount.textContent = splitCountLabel(
        splitInputs.filter((input) => input.checked).length,
        splitInputs.length,
      );
    }
  };

  document
    .querySelectorAll<HTMLInputElement>(
      '#expense-form input[name="participantIds"]',
    )
    .forEach((input) => {
      input.addEventListener("change", updateSplitCount);
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-split-shortcut]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const checked = splitShortcutChecked(button.dataset.splitShortcut);
        if (checked === null) {
          return;
        }
        document
          .querySelectorAll<HTMLInputElement>(
            '#expense-form input[name="participantIds"]',
          )
          .forEach((input) => {
            input.checked = checked;
          });
        updateSplitCount();
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
        const splitError = splitSelectionError(participantIds);
        if (splitError) {
          throw new Error(splitError);
        }
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
