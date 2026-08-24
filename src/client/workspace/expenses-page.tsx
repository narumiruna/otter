import {
  ImageIcon as FileImage,
  Pencil2Icon as Pencil,
  FileTextIcon as Receipt,
  MagnifyingGlassIcon as Search,
  TrashIcon as Trash2,
  UploadIcon as Upload,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { expenseCategories } from "../../shared/expense-metadata.js";
import { currencies, formatMinor } from "../../shared/money.js";
import type { Expense, Trip } from "../../shared/settlement.js";
import {
  defaultExpenseFilters,
  type ExpenseFilters,
  expenseSplitLabel,
  filterAndSortExpenses,
} from "../client-support.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import { ConfirmDialog, SectionHeading } from "./workspace-ui.js";

export function ExpensesPage({
  filters,
  onAddExpense,
  onDirtyChange,
  onFiltersChange,
  readonly = false,
  trip,
}: {
  filters: ExpenseFilters;
  onAddExpense: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onFiltersChange: (filters: ExpenseFilters) => void;
  readonly?: boolean;
  trip: Trip;
}) {
  const setFilters = (
    update: ExpenseFilters | ((filters: ExpenseFilters) => ExpenseFilters),
  ) => {
    onFiltersChange(typeof update === "function" ? update(filters) : update);
  };
  const [editing, setEditing] = useState<Expense | null>(null);
  const expenses = useMemo(
    () => filterAndSortExpenses(trip, filters),
    [filters, trip],
  );
  const activeFilters = activeFilterEntries(filters);
  if (editing)
    return (
      <ExpenseComposer
        expense={editing}
        onCancel={() => setEditing(null)}
        onDirtyChange={onDirtyChange}
        onSaved={() => setEditing(null)}
        trip={trip}
      />
    );
  return (
    <section className="surface grid gap-5" aria-labelledby="expenses-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          description={`顯示 ${expenses.length} / ${trip.expenses.length} 筆支出`}
        >
          <span id="expenses-heading">支出</span>
        </SectionHeading>
        {!readonly ? <Button onClick={onAddExpense}>記一筆</Button> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_13rem]">
        <label className="relative">
          <span className="sr-only">搜尋描述</span>
          <Search
            className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="form-control pl-10"
            placeholder="搜尋支出描述"
            value={filters.query}
            onChange={(event) =>
              setFilters((value) => ({ ...value, query: event.target.value }))
            }
          />
        </label>
        <label>
          <span className="sr-only">排序</span>
          <select
            className="form-control"
            value={filters.sort}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                sort: event.target.value as ExpenseFilters["sort"],
              }))
            }
          >
            <option value="date-desc">日期新到舊</option>
            <option value="date-asc">日期舊到新</option>
            <option value="amount-desc">金額大到小</option>
            <option value="amount-asc">金額小到大</option>
          </select>
        </label>
      </div>
      <details className="disclosure">
        <summary>
          更多篩選{" "}
          <span className="summary-meta">
            {activeFilters.length
              ? `${activeFilters.length} 個已套用`
              : "日期、成員、幣別、分類、標籤"}
          </span>
        </summary>
        <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <Filter label="起日">
            <input
              className="form-control"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((value) => ({
                  ...value,
                  dateFrom: event.target.value,
                }))
              }
            />
          </Filter>
          <Filter label="迄日">
            <input
              className="form-control"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((value) => ({
                  ...value,
                  dateTo: event.target.value,
                }))
              }
            />
          </Filter>
          <Filter label="付款人">
            <ParticipantFilter
              trip={trip}
              value={filters.paidById}
              onChange={(paidById) =>
                setFilters((current) => ({ ...current, paidById }))
              }
            />
          </Filter>
          <Filter label="分帳成員">
            <ParticipantFilter
              trip={trip}
              value={filters.participantId}
              onChange={(participantId) =>
                setFilters((current) => ({ ...current, participantId }))
              }
            />
          </Filter>
          <Filter label="幣別">
            <select
              className="form-control"
              value={filters.currency}
              onChange={(event) =>
                setFilters((value) => ({
                  ...value,
                  currency: event.target.value,
                }))
              }
            >
              <option value="">全部幣別</option>
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </Filter>
          <Filter label="分類">
            <select
              className="form-control"
              value={filters.category}
              onChange={(event) =>
                setFilters((value) => ({
                  ...value,
                  category: event.target.value,
                }))
              }
            >
              <option value="">全部分類</option>
              {expenseCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Filter>
          <Filter label="標籤">
            <input
              className="form-control"
              placeholder="標籤完全符合"
              value={filters.tag}
              onChange={(event) =>
                setFilters((value) => ({ ...value, tag: event.target.value }))
              }
            />
          </Filter>
        </div>
      </details>
      {activeFilters.length ? (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="text-sm text-muted-foreground">已套用：</legend>
          {activeFilters.map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant="secondary"
              onClick={() =>
                setFilters((value) => ({
                  ...value,
                  [key]: defaultExpenseFilters[key],
                }))
              }
            >
              {label} ×
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilters({ ...defaultExpenseFilters })}
          >
            清除全部
          </Button>
        </fieldset>
      ) : null}
      <ExpenseList
        expenses={expenses}
        onAddExpense={onAddExpense}
        onEdit={setEditing}
        readonly={readonly}
        trip={trip}
        filtered={activeFilters.length > 0 || !!filters.query}
        clear={() => setFilters({ ...defaultExpenseFilters })}
      />
    </section>
  );
}

function Filter({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The caller always supplies a nested form control.
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ParticipantFilter({
  onChange,
  trip,
  value,
}: {
  onChange: (value: string) => void;
  trip: Trip;
  value: string;
}) {
  return (
    <select
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">全部成員</option>
      {trip.participants.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  );
}

function activeFilterEntries(
  filters: ExpenseFilters,
): [Exclude<keyof ExpenseFilters, "query" | "sort">, string][] {
  const labels: Record<
    Exclude<keyof ExpenseFilters, "query" | "sort">,
    string
  > = {
    category: `分類：${filters.category}`,
    currency: `幣別：${filters.currency}`,
    dateFrom: `起日：${filters.dateFrom}`,
    dateTo: `迄日：${filters.dateTo}`,
    paidById: "付款人",
    participantId: "分帳成員",
    tag: `標籤：${filters.tag}`,
  };
  return (Object.keys(labels) as (keyof typeof labels)[])
    .filter((key) => !!filters[key])
    .map((key) => [key, labels[key]]);
}

function ExpenseList({
  clear,
  expenses,
  filtered,
  onAddExpense,
  onEdit,
  readonly,
  trip,
}: {
  clear: () => void;
  expenses: Expense[];
  filtered: boolean;
  onAddExpense: () => void;
  onEdit: (expense: Expense) => void;
  readonly: boolean;
  trip: Trip;
}) {
  if (!trip.expenses.length)
    return (
      <div className="empty-state">
        <Receipt className="mx-auto" aria-hidden="true" />
        <h3>還沒有支出</h3>
        <p>記錄第一筆共同支出後，這裡會保留完整明細。</p>
        {!readonly ? (
          <Button onClick={onAddExpense}>記錄第一筆支出</Button>
        ) : null}
      </div>
    );
  if (!expenses.length)
    return (
      <div className="empty-state">
        <h3>沒有符合條件的支出</h3>
        <p>調整條件，或清除篩選查看全部資料。</p>
        <Button onClick={clear} variant="outline">
          清除篩選
        </Button>
      </div>
    );
  const names = new Map(
    trip.participants.map((person) => [person.id, person.name]),
  );
  return (
    <ul
      className="grid gap-3"
      aria-label={filtered ? "篩選後的支出" : "全部支出"}
    >
      {expenses.map((expense) => (
        <li className="rounded-xl border bg-card p-4" key={expense.id}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Receipt className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap justify-between gap-2">
                <strong className="break-anywhere">
                  {expense.description}
                </strong>
                <strong className="tabular-nums">
                  {formatMinor(expense.amountMinor, expense.currency)}
                </strong>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {expense.expenseDate} · {names.get(expense.paidById) ?? "未知"}{" "}
                付款
              </p>
              <p className="text-sm text-muted-foreground">
                {expense.category ?? "其他"}
                {expense.tags?.length ? ` · ${expense.tags.join("、")}` : ""} ·
                分給 {expenseSplitLabel(trip, expense.participantIds)}
              </p>
            </div>
          </div>
          {!readonly ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(expense)}
              >
                <Pencil aria-hidden="true" />
                編輯
              </Button>
              <ReceiptControls expense={expense} trip={trip} />
              <DeleteExpense expense={expense} trip={trip} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ReceiptControls({ expense, trip }: { expense: Expense; trip: Trip }) {
  const { announce, offline, replacePayload } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/trips/${trip.id}/expenses/${expense.id}/receipt`,
        {
          body: file,
          credentials: "same-origin",
          headers: { "Content-Type": file.type },
          method: "PUT",
        },
      );
      const data = (await response.json()) as
        | import("../client-support.js").TripPayload
        | { error?: string };
      if (!response.ok)
        throw new Error("error" in data ? data.error : "收據上傳失敗");
      replacePayload(data as import("../client-support.js").TripPayload);
      announce("已上傳收據");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "收據上傳失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="button-outline button-sm">
        <Upload aria-hidden="true" />
        <span>{busy ? "上傳中…" : "上傳收據"}</span>
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || offline}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </label>
      {expense.receiptUrl ? (
        <a
          className="button-outline button-sm"
          href={expense.receiptUrl}
          target="_blank"
          rel="noreferrer"
        >
          <FileImage aria-hidden="true" />
          查看收據
        </a>
      ) : (
        <span className="self-center text-xs text-muted-foreground">
          沒有收據
        </span>
      )}
      <ActionError message={error} />
      {expense.receiptUrl ? (
        <DeleteReceipt expense={expense} trip={trip} />
      ) : null}
    </>
  );
}
function DeleteReceipt({ expense, trip }: { expense: Expense; trip: Trip }) {
  const { offline, requestPayload } = useWorkspace();
  return (
    <ConfirmDialog
      confirmLabel="刪除收據"
      description="刪除後仍可重新上傳；支出本身不會被刪除。"
      destructive
      disabled={offline}
      onConfirm={() =>
        requestPayload(
          `/api/trips/${trip.id}/expenses/${expense.id}/receipt`,
          { method: "DELETE" },
          "已刪除收據",
        )
      }
      title="刪除這張收據？"
      trigger={
        <Button size="sm" variant="ghost">
          刪除收據
        </Button>
      }
    />
  );
}
function DeleteExpense({ expense, trip }: { expense: Expense; trip: Trip }) {
  const { offline, requestPayload } = useWorkspace();
  return (
    <ConfirmDialog
      confirmLabel={`刪除「${expense.description}」`}
      description="刪除後無法復原，且所有成員餘額與結清建議都會重新計算。"
      destructive
      disabled={offline}
      onConfirm={() =>
        requestPayload(
          `/api/trips/${trip.id}/expenses/${expense.id}`,
          { method: "DELETE" },
          "已刪除支出",
          true,
        )
      }
      title="刪除這筆支出？"
      trigger={
        <Button className="ml-auto" size="sm" variant="ghost">
          <Trash2 aria-hidden="true" />
          刪除
        </Button>
      }
    />
  );
}
