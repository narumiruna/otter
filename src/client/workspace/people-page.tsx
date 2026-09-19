import {
  MixIcon as Merge,
  Pencil2Icon as Pencil,
  TrashIcon as Trash2,
  PersonIcon as UserPlus,
} from "@radix-ui/react-icons";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Participant, Trip } from "../../shared/settlement.js";
import { participantDeleteBlockReason } from "../client-support.js";
import { useI18n, useLocaleError } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

export function PeoplePage({
  readonly = false,
  trip,
}: {
  readonly?: boolean;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useLocaleError();
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } });
  const submit = form.handleSubmit(async ({ name }) => {
    setError("");
    try {
      await requestPayload(
        `/api/trips/${trip.id}/participants`,
        { body: JSON.stringify({ name }), method: "POST" },
        messages.expenseParticipantAdded,
        true,
      );
      form.reset();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.unableToAddPerson,
      );
    }
  });
  return (
    <section className="surface grid gap-5" aria-labelledby="people-heading">
      <SectionHeading
        description={
          messages.expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess
        }
      >
        <span id="people-heading">{messages.expenseParticipants}</span>
      </SectionHeading>
      {!readonly ? (
        <form
          className="grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={submit}
        >
          <FormField label={messages.personsName}>
            <input
              className="form-control"
              maxLength={80}
              placeholder={messages.friendsName}
              {...form.register("name", { required: messages.enterAName })}
            />
          </FormField>
          <BusyButton
            busy={form.formState.isSubmitting}
            disabled={offline}
            type="submit"
          >
            <UserPlus aria-hidden="true" />
            {messages.addPerson}
          </BusyButton>
          <div className="sm:col-span-2">
            <ActionError
              message={error || form.formState.errors.name?.message || ""}
            />
          </div>
        </form>
      ) : (
        <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {
            messages.archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants
          }
        </p>
      )}
      <ul className="divide-y rounded-xl border bg-card">
        {trip.participants.map((person) => (
          <ParticipantRow
            key={person.id}
            person={person}
            readonly={readonly}
            trip={trip}
          />
        ))}
      </ul>
      {!readonly && trip.participants.length > 1 ? (
        <MergeParticipants trip={trip} />
      ) : null}
    </section>
  );
}

function ParticipantRow({
  person,
  readonly,
  trip,
}: {
  person: Participant;
  readonly: boolean;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const blocked =
    participantDeleteBlockReason(trip, person.id) ||
    ((trip.settlementPayments ?? []).some(
      (payment) => payment.fromId === person.id || payment.toId === person.id,
    )
      ? messages.usedByAPayment
      : null);
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground"
        aria-hidden="true"
      >
        {person.name.trim().charAt(0).toLocaleUpperCase() || "?"}
      </span>
      <strong className="min-w-0 flex-1 break-anywhere">{person.name}</strong>
      {!readonly ? (
        <RenameParticipant offline={offline} person={person} trip={trip} />
      ) : null}
      {!readonly &&
        (blocked ? (
          <span className="text-xs text-muted-foreground">
            {messages.cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow(
              {
                reason: blocked,
              },
            )}
          </span>
        ) : (
          <ConfirmDialog
            confirmLabel={messages.deleteName2({ name: person.name })}
            description={
              messages.thisPersonHasNoExpensesOrPaymentsDeletionCannotBeUndone
            }
            destructive
            disabled={offline}
            onConfirm={() =>
              requestPayload(
                `/api/trips/${trip.id}/participants/${person.id}`,
                { method: "DELETE" },
                messages.expenseParticipantDeleted,
                true,
              )
            }
            title={messages.deleteThisExpenseParticipant}
            trigger={
              <Button size="sm" variant="ghost">
                <Trash2 aria-hidden="true" />
                {messages.delete}
              </Button>
            }
          />
        ))}
    </li>
  );
}

function RenameParticipant({
  offline,
  person,
  trip,
}: {
  offline: boolean;
  person: Participant;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const { requestPayload } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [error, setError] = useLocaleError();
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await requestPayload(
        `/api/trips/${trip.id}/participants/${person.id}`,
        { body: JSON.stringify({ name }), method: "PATCH" },
        messages.nameUpdated,
      );
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.unableToUpdateName,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={offline}
        render={<Button disabled={offline} size="sm" variant="outline" />}
      >
        <Pencil aria-hidden="true" />
        {messages.rename}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {messages.renameName({ name: person.name })}
          </DialogTitle>
          <DialogDescription>
            {messages.existingExpensesAndPaymentsWillRemainLinkedToThisPerson}
          </DialogDescription>
        </DialogHeader>
        <FormField label={messages.newName}>
          <input
            className="form-control"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <ActionError message={error} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {messages.cancel}
          </DialogClose>
          <BusyButton
            busy={busy}
            disabled={offline}
            onClick={() => void save()}
          >
            {messages.saveName}
          </BusyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MergeParticipants({ trip }: { trip: Trip }) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [sourceId, setSourceId] = useState(trip.participants[0]?.id ?? "");
  const [targetId, setTargetId] = useState(trip.participants[1]?.id ?? "");
  const [error, setError] = useLocaleError();
  const source = trip.participants.find((person) => person.id === sourceId);
  const target = trip.participants.find((person) => person.id === targetId);
  const counts = useMemo(
    () => ({
      expenses: trip.expenses.filter(
        (expense) =>
          expense.paidById === sourceId ||
          expense.participantIds.includes(sourceId),
      ).length,
      payments: (trip.settlementPayments ?? []).filter(
        (payment) => payment.fromId === sourceId || payment.toId === sourceId,
      ).length,
    }),
    [sourceId, trip.expenses, trip.settlementPayments],
  );
  return (
    <details className="disclosure">
      <summary>
        <Merge aria-hidden="true" />
        {messages.advancedPeopleTools}{" "}
        <span className="summary-meta">{messages.mergeDuplicatePeople}</span>
      </summary>
      <div className="grid gap-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={messages.sourcePerson}>
            <select
              className="form-control"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
            >
              {trip.participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={messages.mergeInto}>
            <select
              className="form-control"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {trip.participants.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="rounded-xl border bg-muted/50 p-4 text-sm">
          <strong>{messages.changePreview}</strong>
          <p className="mt-1">
            {messages.expensesRelatedExpensesAndPaymentsPaymentsForSourceWillMoveToTargetThenTheSourcePersonWillBeDeleted(
              {
                source: source?.name ?? messages.sourcePerson,
                expenses: counts.expenses,
                payments: counts.payments,
                target: target?.name ?? messages.targetPerson,
              },
            )}
          </p>
        </div>
        <ActionError message={error} />
        <ConfirmDialog
          confirmLabel={messages.mergePeople}
          disabled={offline || !source || !target || sourceId === targetId}
          description={messages.sourceWillBeDeletedAndRelatedDataWillBeTransferredToTargetAtomically(
            {
              source: source?.name ?? messages.sourcePerson,
              target: target?.name ?? messages.targetPerson,
            },
          )}
          destructive
          onConfirm={async () => {
            try {
              setError("");
              await requestPayload(
                `/api/trips/${trip.id}/participants/${sourceId}/merge`,
                {
                  body: JSON.stringify({ targetParticipantId: targetId }),
                  method: "POST",
                },
                messages.expenseParticipantsMerged,
                true,
              );
            } catch (caught) {
              setError(
                caught instanceof Error ? caught.message : messages.mergeFailed,
              );
            }
          }}
          title={messages.applyMerge}
          trigger={
            <Button variant="outline">{messages.previewAndMerge}</Button>
          }
        />
      </div>
    </details>
  );
}
