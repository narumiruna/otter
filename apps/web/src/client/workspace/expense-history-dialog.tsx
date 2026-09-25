import {
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
import { useI18n } from "../i18n.js";
import { ExpenseRestoreAction } from "./expense-restore-action.js";
import { ExpenseSnapshotDetails } from "./expense-snapshot-details.js";
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
    restored: messages.expenseHistoryRestored,
  };
  const sources: Record<RevisionSource, string> = {
    expense: messages.expenseHistorySourceExpense,
    csv_import: messages.expenseHistorySourceCsv,
    backup_restore: messages.expenseHistorySourceRestore,
    participant_merge: messages.expenseHistorySourceMerge,
    receipt: messages.expenseHistorySourceReceipt,
    development_seed: messages.expenseHistorySourceSeed,
    migration: messages.expenseHistorySourceMigration,
    version_restore: messages.expenseHistorySourceVersionRestore,
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
                  <ExpenseRestoreAction tripId={tripId} revision={revision} />
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
