import { ChevronLeft, ReceiptText, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { expenseCategories } from "../../shared/expense-metadata.js";
import {
  parseSplitMode,
  previewParticipantShares,
  type SplitMode,
} from "../../shared/expense-splits.js";
import {
  type Currency,
  currencies,
  currencyInfo,
  formatMinor,
  isCurrency,
  parseAmountToMinor,
} from "../../shared/money.js";
import type { Expense, Trip } from "../../shared/settlement.js";
import { todayDate } from "../client-support.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

type ExpenseDraft = {
  amount: string;
  category: string;
  currency: Currency;
  description: string;
  expenseDate: string;
  paidById: string;
  participantIds: string[];
  splitMode: SplitMode;
  splitValues: Record<string, string>;
  tags: string;
};

function defaults(trip: Trip, expense?: Expense): ExpenseDraft {
  const explicit = new Map(
    expense?.participantShares?.map((share) => [
      share.participantId,
      share.shareMinor,
    ]) ?? [],
  );
  return {
    amount: expense
      ? String(
          expense.amountMinor / 10 ** currencyInfo[expense.currency].minorUnits,
        )
      : "",
    category: expense?.category ?? "其他",
    currency: expense?.currency ?? trip.baseCurrency,
    description: expense?.description ?? "",
    expenseDate: expense?.expenseDate ?? todayDate(),
    paidById: expense?.paidById ?? trip.participants[0]?.id ?? "",
    participantIds:
      expense?.participantIds ?? trip.participants.map((person) => person.id),
    splitMode: explicit.size ? "amount" : "equal",
    splitValues: Object.fromEntries(
      trip.participants.map((person) => [
        person.id,
        explicit.has(person.id) && expense
          ? String(
              (explicit.get(person.id) ?? 0) /
                10 ** currencyInfo[expense.currency].minorUnits,
            )
          : "",
      ]),
    ),
    tags: (expense?.tags ?? []).join(", "),
  };
}

export function ExpenseComposer({
  expense,
  onCancel,
  onDirtyChange,
  onSaved,
  trip,
}: {
  expense?: Expense;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void;
  trip: Trip;
}) {
  const { offline, requestPayload } = useWorkspace();
  const [serverError, setServerError] = useState("");
  const form = useForm<ExpenseDraft>({
    defaultValues: defaults(trip, expense),
  });
  const values = form.watch();
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [isDirty]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const preview = useMemo(() => {
    if (!values.amount.trim() || !isCurrency(values.currency)) return null;
    try {
      const amountMinor = parseAmountToMinor(values.amount, values.currency);
      const shares = previewParticipantShares(
        parseSplitMode(values.splitMode),
        values.participantIds,
        amountMinor,
        values.splitValues,
        values.currency,
      );
      return { amountMinor, error: "", shares };
    } catch (error) {
      return {
        amountMinor: 0,
        error: error instanceof Error ? error.message : "分帳格式錯誤",
        shares: [],
      };
    }
  }, [
    values.amount,
    values.currency,
    values.participantIds,
    values.splitMode,
    values.splitValues,
  ]);

  const submit = form.handleSubmit(async (draft) => {
    setServerError("");
    if (!draft.participantIds.length) {
      form.setError("participantIds", { message: "請至少選擇一位分帳成員" });
      return;
    }
    if (preview?.error) {
      setServerError(preview.error);
      return;
    }
    try {
      await requestPayload(
        expense
          ? `/api/trips/${trip.id}/expenses/${expense.id}`
          : `/api/trips/${trip.id}/expenses`,
        {
          body: JSON.stringify(draft),
          method: expense ? "PATCH" : "POST",
        },
        expense ? "已儲存支出變更" : "已記錄支出",
        true,
      );
      form.reset(defaults(trip));
      onSaved?.();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "無法儲存支出");
    }
  });

  const cancelButton = (
    <Button
      type="button"
      variant="outline"
      onClick={isDirty ? undefined : onCancel}
    >
      <ChevronLeft aria-hidden="true" />
      取消
    </Button>
  );

  return (
    <section
      className="surface grid gap-5"
      aria-labelledby="expense-composer-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <SectionHeading
          description={
            expense
              ? "確認分帳預覽後再儲存變更。"
              : "先填必要資料；不平均分帳與標籤可稍後展開。"
          }
        >
          <span id="expense-composer-heading">
            {expense ? "編輯支出" : "新增支出"}
          </span>
        </SectionHeading>
        {isDirty ? (
          <ConfirmDialog
            confirmLabel="捨棄草稿"
            description="尚未儲存的內容會消失，既有資料不會改變。"
            destructive
            onConfirm={onCancel}
            title="要捨棄這份草稿嗎？"
            trigger={cancelButton}
          />
        ) : (
          cancelButton
        )}
      </div>

      <form className="grid gap-5" noValidate onSubmit={submit}>
        <ActionError message={serverError} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="描述">
            <input
              className="form-control"
              maxLength={120}
              placeholder="晚餐、飯店、車票"
              {...form.register("description", { required: "請輸入支出描述" })}
            />
            {form.formState.errors.description ? (
              <span className="field-error">
                {form.formState.errors.description.message}
              </span>
            ) : null}
          </FormField>
          <FormField label="金額">
            <input
              className="form-control"
              inputMode="decimal"
              placeholder="1000"
              {...form.register("amount", { required: "請輸入支出金額" })}
            />
            {form.formState.errors.amount ? (
              <span className="field-error">
                {form.formState.errors.amount.message}
              </span>
            ) : null}
          </FormField>
          <FormField label="日期">
            <input
              className="form-control"
              type="date"
              {...form.register("expenseDate", { required: true })}
            />
          </FormField>
          <FormField label="付款人">
            <select
              className="form-control"
              {...form.register("paidById", { required: true })}
            >
              {trip.participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="貨幣">
            <select className="form-control" {...form.register("currency")}>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency} · {currencyInfo[currency].label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="rounded-xl border bg-muted/50 p-4" aria-live="polite">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ReceiptText aria-hidden="true" />
            分帳預覽
          </div>
          {!preview ? (
            <p className="text-sm text-muted-foreground">
              輸入金額後會顯示每位成員的分帳金額。
            </p>
          ) : preview.error ? (
            <p className="field-error">{preview.error}</p>
          ) : (
            <>
              <p className="mb-3 text-sm">
                {trip.participants.find(
                  (person) => person.id === values.paidById,
                )?.name ?? "付款人"}{" "}
                支付{" "}
                <strong>
                  {formatMinor(preview.amountMinor, values.currency)}
                </strong>
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {preview.shares.map((share) => (
                  <li
                    className="flex justify-between rounded-lg bg-card px-3 py-2 text-sm"
                    key={share.participantId}
                  >
                    <span>
                      {
                        trip.participants.find(
                          (person) => person.id === share.participantId,
                        )?.name
                      }
                    </span>
                    <strong className="tabular-nums">
                      {formatMinor(share.shareMinor, values.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <details className="disclosure">
          <summary>
            <Users aria-hidden="true" />
            修改分帳成員與方式{" "}
            <span className="summary-meta">
              已選 {values.participantIds.length} / {trip.participants.length}
            </span>
          </summary>
          <div className="grid gap-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue(
                    "participantIds",
                    trip.participants.map((person) => person.id),
                    { shouldDirty: true },
                  )
                }
              >
                全選
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue("participantIds", [], { shouldDirty: true })
                }
              >
                清除
              </Button>
            </div>
            <fieldset className="choice-grid">
              <legend className="sr-only">分帳成員</legend>
              {trip.participants.map((person) => (
                <label className="choice" key={person.id}>
                  <input
                    type="checkbox"
                    value={person.id}
                    {...form.register("participantIds")}
                  />{" "}
                  <span>{person.name}</span>
                </label>
              ))}
            </fieldset>
            <FormField label="分帳方式">
              <select className="form-control" {...form.register("splitMode")}>
                <option value="equal">平均分帳</option>
                <option value="amount">指定金額</option>
                <option value="ratio">比例</option>
                <option value="shares">份數</option>
              </select>
            </FormField>
            {values.splitMode !== "equal" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {trip.participants
                  .filter((person) => values.participantIds.includes(person.id))
                  .map((person) => (
                    <FormField
                      key={person.id}
                      label={`${person.name}的${values.splitMode === "amount" ? "金額" : values.splitMode === "ratio" ? "比例" : "份數"}`}
                    >
                      <input
                        className="form-control"
                        inputMode="decimal"
                        {...form.register(`splitValues.${person.id}`)}
                      />
                    </FormField>
                  ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="disclosure">
          <summary>
            更多資料 <span className="summary-meta">分類、標籤</span>
          </summary>
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <FormField label="分類">
              <select className="form-control" {...form.register("category")}>
                {expenseCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </FormField>
            <FormField label="標籤" hint="以逗號分隔，例如 早餐, 交通">
              <input
                className="form-control"
                maxLength={249}
                {...form.register("tags")}
              />
            </FormField>
          </div>
        </details>

        <div className="sticky-submit flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isDirty ? (
            <ConfirmDialog
              confirmLabel="捨棄草稿"
              description="尚未儲存的內容會消失。"
              destructive
              onConfirm={onCancel}
              title="要取消嗎？"
              trigger={cancelButton}
            />
          ) : (
            cancelButton
          )}
          <BusyButton
            busy={form.formState.isSubmitting}
            busyLabel="儲存中…"
            disabled={offline || !!preview?.error}
            type="submit"
          >
            {expense ? "儲存變更" : "記錄支出"}
          </BusyButton>
        </div>
      </form>
    </section>
  );
}
