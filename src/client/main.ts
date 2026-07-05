import "./styles.css";
import { tripExpensesCsv, tripResultsCsv } from "../shared/csv.js";
import { currencies, currencyInfo } from "../shared/money.js";
import {
  type AppState,
  api,
  type DevAdmin,
  defaultExpenseFilters,
  downloadText,
  expenseFormError,
  htmlEscape,
  isExpenseSort,
  safeFilename,
  splitCountLabel,
  splitShortcutChecked,
  type TripPayload,
  type TripSummary,
  type User,
  type WorkspaceTab,
  workspaceTabForKey,
  workspaceTabs,
} from "./client-support.js";
import { authView, dashboardView } from "./views.js";

const state: AppState = {
  activeTab: "overview",
  busy: false,
  expenseFilters: { ...defaultExpenseFilters },
  devAdmin: null,
  error: "",
  formError: "",
  formErrorTarget: "",
  message: "",
  selected: null,
  trips: [],
  archivedTrips: [],
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

async function run(
  action: () => Promise<void>,
  options: { errorTarget?: string } = {},
) {
  if (state.busy) {
    return;
  }

  try {
    state.busy = true;
    state.formError = "";
    state.formErrorTarget = "";
    setMessage("", "");
    if (!options.errorTarget) {
      render();
    }
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : "發生錯誤";
    if (options.errorTarget) {
      state.formError = message;
      state.formErrorTarget = options.errorTarget;
    } else {
      setMessage("", message);
    }
  } finally {
    state.busy = false;
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
  const data = await api<{
    archivedTrips?: TripSummary[];
    trips: TripSummary[];
  }>("/api/trips");
  state.trips = data.trips;
  state.archivedTrips = data.archivedTrips ?? [];
  if (!state.selected && state.trips[0]) {
    await selectTrip(state.trips[0].id);
  }
}

async function selectTrip(tripId: string) {
  state.selected = await api<TripPayload>(`/api/trips/${tripId}`);
  state.activeTab = "add-expense";
  state.expenseFilters = { ...defaultExpenseFilters };
}

function isWorkspaceTab(value: string | undefined): value is WorkspaceTab {
  return workspaceTabs.includes(value as WorkspaceTab);
}

function splitValuesFromForm(
  form: FormData,
  participantIds: string[],
): Record<string, string> {
  return Object.fromEntries(
    participantIds.map((participantId) => [
      participantId,
      String(form.get(`splitValue:${participantId}`) ?? ""),
    ]),
  );
}

function localDateOnly(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function render() {
  app.innerHTML = `
    <a class="skip-link" href="#main-content">跳到主要內容</a>
    <main id="main-content" class="app${state.busy ? " is-busy" : ""}" aria-busy="${state.busy}" tabindex="-1">
      <section class="hero${state.user ? " hero-compact" : ""}">
        <div class="brand-row">
          <span class="brand-mark" aria-hidden="true">o</span>
          <div>
            <h1>otter</h1>
            <p class="muted">${state.user ? "旅行拆帳工作區" : "旅行和朋友聚會的 TypeScript 記帳拆帳 app"}</p>
          </div>
        </div>
        ${
          state.user
            ? `<div class="row user-menu"><span>${htmlEscape(state.user.name)}</span><button id="logout" class="secondary" type="button">登出</button></div>`
            : ""
        }
      </section>
      ${state.busy ? '<p class="notice" role="status" aria-live="polite">正在處理…</p>' : ""}
      ${!state.busy && state.message ? `<p class="notice" role="status" aria-live="polite">${htmlEscape(state.message)}</p>` : ""}
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
        state.activeTab = "overview";
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
        state.activeTab = "overview";
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
        state.archivedTrips = [];
        state.selected = null;
        state.activeTab = "overview";
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
        state.activeTab = "add-expense";
        await loadTrips();
        setMessage("已新增支出群組");
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

  const workspaceTabButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-workspace-tab]"),
  );
  for (const button of workspaceTabButtons) {
    button.addEventListener("click", () => {
      if (!isWorkspaceTab(button.dataset.workspaceTab)) {
        return;
      }
      state.activeTab = button.dataset.workspaceTab;
      render();
    });
    button.addEventListener("keydown", (event) => {
      if (!isWorkspaceTab(button.dataset.workspaceTab)) {
        return;
      }
      const nextTab = workspaceTabForKey(
        button.dataset.workspaceTab,
        event.key,
      );
      if (!nextTab) {
        return;
      }
      event.preventDefault();
      state.activeTab = nextTab;
      render();
      document
        .querySelector<HTMLButtonElement>(`#workspace-tab-${nextTab}`)
        ?.focus();
    });
  }

  document
    .querySelector<HTMLFormElement>("#expense-filters")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
    });

  document
    .querySelector<HTMLFormElement>("#expense-filters")
    ?.addEventListener("input", (event) => {
      const activeEl = document.activeElement as HTMLInputElement | null;
      const activeName = activeEl?.name ?? null;
      const selectionStart = activeEl?.selectionStart ?? null;
      const form = new FormData(event.currentTarget as HTMLFormElement);
      const sortRaw = String(form.get("sort") ?? "");
      state.expenseFilters = {
        currency: String(form.get("currency") ?? ""),
        dateFrom: String(form.get("dateFrom") ?? ""),
        dateTo: String(form.get("dateTo") ?? ""),
        paidById: String(form.get("paidById") ?? ""),
        participantId: String(form.get("participantId") ?? ""),
        query: String(form.get("query") ?? ""),
        sort: isExpenseSort(sortRaw) ? sortRaw : defaultExpenseFilters.sort,
      };
      render();
      if (activeName) {
        const restored = document.querySelector<HTMLInputElement>(
          `#expense-filters [name="${activeName}"]`,
        );
        if (restored) {
          restored.focus();
          if (selectionStart !== null && "setSelectionRange" in restored) {
            try {
              restored.setSelectionRange(selectionStart, selectionStart);
            } catch {
              // element type may not support selection ranges
            }
          }
        }
      }
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-clear-expense-filters]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.expenseFilters = { ...defaultExpenseFilters };
        render();
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
        tripResultsCsv(
          selected.balances,
          selected.settlements,
          selected.trip.settlementPayments,
          selected.trip.participants,
        ),
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
    .querySelectorAll<HTMLFormElement>("[data-settlement-payment-form]")
    .forEach((formElement) => {
      formElement.addEventListener("submit", (event) => {
        event.preventDefault();
        const tripId = state.selected?.trip.id;
        if (!tripId) {
          return;
        }
        const form = new FormData(formElement);
        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/settlement-payments`,
            {
              body: JSON.stringify({
                amount: String(form.get("amount") ?? ""),
                currency: String(form.get("currency") ?? ""),
                fromId: String(form.get("fromId") ?? ""),
                note: String(form.get("note") ?? ""),
                paidAt: String(form.get("paidAt") || localDateOnly()),
                toId: String(form.get("toId") ?? ""),
              }),
              method: "POST",
            },
          );
          setMessage("已記錄付款");
        });
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-delete-settlement-payment-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const tripId = state.selected?.trip.id;
        const paymentId = button.dataset.deleteSettlementPaymentId;
        if (!tripId || !paymentId || !confirm("刪除這筆付款紀錄？")) {
          return;
        }
        void run(async () => {
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/settlement-payments/${paymentId}`,
            { method: "DELETE" },
          );
          setMessage("已刪除付款紀錄");
        });
      });
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
    .querySelector<HTMLButtonElement>("#archive-trip")
    ?.addEventListener("click", (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const tripId = state.selected?.trip.id;
      const archived = button.dataset.archived !== "true";
      if (!tripId) {
        return;
      }

      void run(async () => {
        state.selected = await api<TripPayload>(`/api/trips/${tripId}`, {
          body: JSON.stringify({ archived }),
          method: "PATCH",
        });
        await loadTrips();
        setMessage(archived ? "已封存支出群組" : "已還原支出群組");
      });
    });

  document
    .querySelector<HTMLFormElement>("#exchange-rates-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const tripId = state.selected?.trip.id;
      if (!tripId) {
        return;
      }
      const form = new FormData(event.currentTarget as HTMLFormElement);
      const exchangeRates = Object.fromEntries(
        currencies.map((currency) => [
          currency,
          String(form.get(`rate:${currency}`) ?? ""),
        ]),
      );
      void run(async () => {
        state.selected = await api<TripPayload>(`/api/trips/${tripId}`, {
          body: JSON.stringify({ exchangeRates }),
          method: "PATCH",
        });
        setMessage("已更新匯率");
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
        state.activeTab = "overview";
        await loadTrips();
        setMessage("已刪除支出群組");
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
    .querySelector<HTMLFormElement>("#participant-merge-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const tripId = state.selected?.trip.id;
      if (!tripId) {
        return;
      }
      const form = new FormData(event.currentTarget as HTMLFormElement);
      const sourceParticipantId = String(form.get("sourceParticipantId") ?? "");
      const targetParticipantId = String(form.get("targetParticipantId") ?? "");
      if (
        !sourceParticipantId ||
        !targetParticipantId ||
        sourceParticipantId === targetParticipantId ||
        !confirm("確定要合併這兩位成員？來源成員會被刪除。")
      ) {
        return;
      }
      void run(async () => {
        state.selected = await api<TripPayload>(
          `/api/trips/${tripId}/participants/${sourceParticipantId}/merge`,
          {
            body: JSON.stringify({ targetParticipantId }),
            method: "POST",
          },
        );
        await loadTrips();
        setMessage("已合併成員");
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

      void run(
        async () => {
          const amount = String(form.get("amount") ?? "");
          const formError = expenseFormError({ amount, participantIds });
          if (formError) {
            throw new Error(formError);
          }
          state.selected = await api<TripPayload>(
            `/api/trips/${tripId}/expenses`,
            {
              body: JSON.stringify({
                amount,
                currency: String(form.get("currency") ?? "TWD"),
                description: String(form.get("description") ?? ""),
                expenseDate: String(form.get("expenseDate") ?? ""),
                paidById: String(form.get("paidById") ?? ""),
                participantIds,
                splitMode: String(form.get("splitMode") ?? "equal"),
                splitValues: splitValuesFromForm(form, participantIds),
              }),
              method: "POST",
            },
          );
          await loadTrips();
          setMessage("已記錄支出");
        },
        { errorTarget: "expense-form" },
      );
    });

  document
    .querySelectorAll<HTMLFormElement>("[data-edit-expense-form]")
    .forEach((formElement) => {
      formElement.addEventListener("submit", (event) => {
        event.preventDefault();
        const tripId = state.selected?.trip.id;
        const expenseId = formElement.dataset.editExpenseForm;
        const errorTarget =
          formElement.dataset.formErrorTarget ?? `expense-edit-${expenseId}`;
        if (!tripId || !expenseId) {
          return;
        }

        const form = new FormData(formElement);
        const participantIds = Array.from(
          formElement.querySelectorAll<HTMLInputElement>(
            'input[name="participantIds"]:checked',
          ),
        ).map((input) => input.value);

        void run(
          async () => {
            const amount = String(form.get("amount") ?? "");
            const formError = expenseFormError({ amount, participantIds });
            if (formError) {
              throw new Error(formError);
            }
            state.selected = await api<TripPayload>(
              `/api/trips/${tripId}/expenses/${expenseId}`,
              {
                body: JSON.stringify({
                  amount,
                  currency: String(form.get("currency") ?? "TWD"),
                  description: String(form.get("description") ?? ""),
                  expenseDate: String(form.get("expenseDate") ?? ""),
                  paidById: String(form.get("paidById") ?? ""),
                  participantIds,
                  splitMode: String(form.get("splitMode") ?? "equal"),
                  splitValues: splitValuesFromForm(form, participantIds),
                }),
                method: "PATCH",
              },
            );
            setMessage("已更新支出");
          },
          { errorTarget },
        );
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>("[data-cancel-expense-edit]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const details = button.closest("details");
        if (!details) {
          return;
        }
        details.removeAttribute("open");
        const form = details.querySelector<HTMLFormElement>("form");
        if (form) {
          form.reset();
          const errorTarget = form.dataset.formErrorTarget;
          if (errorTarget && state.formErrorTarget === errorTarget) {
            state.formError = "";
            state.formErrorTarget = "";
          }
        }
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
