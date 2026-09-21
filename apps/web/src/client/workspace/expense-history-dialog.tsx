import {
  type ExpenseChangeField,
  type ExpenseSnapshot,
  parseExpenseHistoryPage,
  type RevisionSource,
} from "@narumitw/otter-contracts";
import { ClockIcon } from "@radix-ui/react-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "../client-support.js";
import { localizeMessage, useI18n } from "../i18n.js";
import { ActionError, useOptionalWorkspace } from "./workspace-context.js";

export function ExpenseHistoryDialog(props: {
  tripId: string;
  expenseId?: string;
  name?: string;
}) {
  const workspace = useOptionalWorkspace();
  if (!workspace || workspace.payload.readonly) return null;
  return <HistoryDialog {...props} />;
}
function HistoryDialog({
  tripId,
  expenseId,
  name,
}: {
  tripId: string;
  expenseId?: string;
  name?: string;
}) {
  const { messages, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const history = useInfiniteQuery({
    queryKey: ["expense-history", tripId, expenseId ?? "all"],
    enabled: open,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const query = new URLSearchParams({ limit: "20" });
      if (expenseId) query.set("expenseId", expenseId);
      if (pageParam) query.set("cursor", pageParam);
      return parseExpenseHistoryPage(
        await api(
          `/api/trips/${encodeURIComponent(tripId)}/expense-history?${query}`,
          { signal },
        ),
      );
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
    staleTime: 0,
  });
  const title = name
    ? messages.expenseHistoryForName({ name })
    : messages.expenseHistory;
  const actions = {
    baseline: messages.expenseHistoryBaseline,
    created: messages.expenseHistoryCreated,
    updated: messages.expenseHistoryUpdated,
    deleted: messages.expenseHistoryDeleted,
  };
  const sources: Record<RevisionSource, string> = {
    expense: messages.expenseHistorySourceExpense,
    csv_import: messages.expenseHistorySourceCsv,
    backup_restore: messages.expenseHistorySourceRestore,
    participant_merge: messages.expenseHistorySourceMerge,
    receipt: messages.expenseHistorySourceReceipt,
    development_seed: messages.expenseHistorySourceSeed,
    migration: messages.expenseHistorySourceMigration,
  };
  const revisions = history.data?.pages.flatMap((page) => page.revisions) ?? [];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            aria-label={title}
            variant="ghost"
            size={name ? "icon-sm" : "sm"}
          />
        }
      >
        <ClockIcon aria-hidden="true" />
        {name ? null : title}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {messages.expenseHistoryDescription}
          </DialogDescription>
        </DialogHeader>
        {history.isPending ? <p role="status">{messages.loading}</p> : null}
        {history.isError ? (
          <div>
            <ActionError message={history.error.message} />
            <Button onClick={() => void history.refetch()}>
              {messages.reload}
            </Button>
          </div>
        ) : (
          <>
            {!history.isPending && !revisions.length ? (
              <p>{messages.expenseHistoryEmpty}</p>
            ) : null}
            <ol className="grid gap-4">
              {revisions.map((revision) => (
                <li
                  className="grid min-w-0 gap-2 rounded-lg border p-3 break-anywhere"
                  key={revision.id}
                >
                  <h3 className="font-semibold">
                    {revision.snapshot.expense.description} ·{" "}
                    {actions[revision.action]} · v{revision.version}
                  </h3>
                  <p>
                    {revision.actor?.name ?? messages.expenseHistorySystem} ·{" "}
                    <time dateTime={revision.recordedAt}>
                      {new Date(revision.recordedAt).toLocaleString(locale)}
                    </time>{" "}
                    · {sources[revision.source]}
                  </p>
                  {revision.action === "baseline" ? (
                    <p>{messages.expenseHistoryBaselineNotice}</p>
                  ) : null}
                  {revision.previousSnapshot &&
                  revision.changedFields.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <h4>{messages.expenseHistoryBefore}</h4>
                        <ExpenseSnapshotDetails
                          snapshot={revision.previousSnapshot}
                          fields={revision.changedFields}
                        />
                      </div>
                      <div>
                        <h4>{messages.expenseHistoryAfter}</h4>
                        <ExpenseSnapshotDetails
                          snapshot={revision.snapshot}
                          fields={revision.changedFields}
                        />
                      </div>
                    </div>
                  ) : (
                    <ExpenseSnapshotDetails snapshot={revision.snapshot} />
                  )}
                  {revision.snapshot.receipt ||
                  revision.previousSnapshot?.receipt ? (
                    <p className="text-sm text-muted-foreground">
                      {messages.expenseHistoryReceiptNotice}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
            {history.hasNextPage ? (
              <Button
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
              >
                {messages.expenseHistoryMore}
              </Button>
            ) : null}
          </>
        )}
        <DialogClose render={<Button variant="outline" />}>
          {messages.cancel}
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseSnapshotDetails({
  snapshot,
  fields = [
    "description",
    "amountMinor",
    "expenseDate",
    "paidById",
    "category",
    "tags",
    "participantIds",
    "participantShares",
  ],
}: {
  snapshot: ExpenseSnapshot;
  fields?: ExpenseChangeField[];
}) {
  const { messages, formatMoney } = useI18n();
  const e = snapshot.expense;
  const names = new Map(
    snapshot.participants.map((person) => [person.id, person.name]),
  );
  const labels: Record<ExpenseChangeField, string> = {
    description: messages.description,
    amountMinor: messages.amount,
    currency: messages.currency,
    expenseDate: messages.date,
    paidById: messages.paidBy,
    category: messages.category,
    tags: messages.tags,
    participantIds: messages.splitWith,
    participantShares: messages.expenseHistoryShares,
    receipt: messages.receipt,
  };
  const values: Record<ExpenseChangeField, string> = {
    description: e.description,
    amountMinor: formatMoney(e.amountMinor, e.currency),
    currency: e.currency,
    expenseDate: e.expenseDate,
    paidById: names.get(e.paidById) ?? e.paidById,
    category: localizeMessage(e.category ?? "其他"),
    tags: e.tags?.join(", ") || "—",
    participantIds: e.participantIds
      .map((id) => names.get(id) ?? id)
      .join(", "),
    participantShares:
      e.participantShares
        ?.map(
          (s) =>
            `${names.get(s.participantId) ?? s.participantId}: ${formatMoney(s.shareMinor, e.currency)}`,
        )
        .join(", ") ?? messages.splitEqually,
    receipt: snapshot.receipt
      ? `${snapshot.receipt.mimeType} · ${snapshot.receipt.id}`
      : "—",
  };
  return (
    <dl className="grid gap-1 text-sm break-anywhere">
      {fields.map((field) => (
        <div key={field}>
          <dt className="font-medium">{labels[field]}</dt>
          <dd>{values[field]}</dd>
        </div>
      ))}
    </dl>
  );
}
