import type { Participant, Trip } from "@narumitw/otter-core/settlement";
import {
  InfoCircledIcon,
  MixIcon as Merge,
  Pencil2Icon as Pencil,
  TrashIcon as Trash2,
  PersonIcon as UserPlus,
} from "@radix-ui/react-icons";
import { Popover } from "@radix-ui/themes";
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
import { participantDeleteBlockReason } from "../client-support.js";
import { useI18n, useLocaleError } from "../i18n.js";
import { useMediaQuery } from "../use-media-query.js";
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
  const mobile = useMediaQuery("(max-width: 680px)");
  const [addOpen, setAddOpen] = useState(false);
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
      setAddOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.unableToAddPerson,
      );
    }
  });
  return (
    <section
      className="surface people-page grid gap-4"
      aria-labelledby="people-heading"
    >
      <div className="section-actions">
        <SectionHeading
          description={
            messages.expenseParticipantsDoNotNeedToSignInManageAccountsWithAccessUnderMoreSharingAndAccess
          }
        >
          <span id="people-heading">{messages.expenseParticipants}</span>
          <span className="count-pill" aria-hidden="true">
            {messages.countPeople({ count: trip.participants.length })}
          </span>
        </SectionHeading>
        {!readonly ? (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button disabled={offline} />}>
              <UserPlus aria-hidden="true" />
              {messages.addPerson}
            </DialogTrigger>
            <DialogContent
              className="responsive-sheet"
              closeLabel={messages.close}
            >
              <DialogHeader>
                <DialogTitle>{messages.addPerson}</DialogTitle>
                <DialogDescription>
                  {messages.settlementRepresentativeHelp}
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={submit}>
                <FormField label={messages.personsName}>
                  <input
                    className="form-control"
                    maxLength={80}
                    placeholder={messages.friendsName}
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register("name", {
                      required: messages.enterAName,
                    })}
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
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      {readonly ? (
        <p className="text-sm text-muted-foreground">
          {
            messages.archivedGroupsAreReadOnlyRestoreThisGroupToChangeParticipants
          }
        </p>
      ) : null}
      {trip.participants.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {messages.settlementRepresentativeHelp}
        </p>
      ) : null}
      {trip.participants.length === 0 ? (
        <div className="people-empty-state">
          <UserPlus aria-hidden="true" />
          <h4>
            {readonly
              ? messages.countPeople({ count: 0 })
              : messages.addTravelCompanionsFirst}
          </h4>
          {!readonly ? (
            <p>
              {messages.addThePeopleSplittingExpensesToCalculateEachBalance}
            </p>
          ) : null}
        </div>
      ) : mobile ? (
        <ul className="people-list">
          {trip.participants.map((person) => (
            <ParticipantRow
              key={person.id}
              person={person}
              readonly={readonly}
              trip={trip}
              mobile
            />
          ))}
        </ul>
      ) : (
        <table className="people-table">
          <thead>
            <tr>
              <th scope="col">{messages.personLabel}</th>
              <th scope="col">{messages.settlementRepresentative}</th>
              <th scope="col">{messages.actions}</th>
            </tr>
          </thead>
          <tbody>
            {trip.participants.map((person) => (
              <ParticipantRow
                key={person.id}
                person={person}
                readonly={readonly}
                trip={trip}
              />
            ))}
          </tbody>
        </table>
      )}
      {!readonly && trip.participants.length > 0 ? (
        <p className="people-deletion-help text-sm text-muted-foreground">
          <InfoCircledIcon aria-hidden="true" />
          {messages.peopleDeletionHelp}
        </p>
      ) : null}
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
  mobile = false,
}: {
  person: Participant;
  readonly: boolean;
  trip: Trip;
  mobile?: boolean;
}) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const blocked = participantDeleteBlockReason(trip, person.id);
  const dependents = trip.participants.filter(
    (candidate) => candidate.settledById === person.id,
  );
  const identity = (
    <span className="people-identity">
      <span className="person-avatar" aria-hidden="true">
        {person.name.trim().charAt(0).toLocaleUpperCase() || "?"}
      </span>
      <span className="min-w-0">
        <strong className="break-anywhere">{person.name}</strong>
        {dependents.length ? (
          <small>
            {messages.representsPeople({
              names: dependents.map((p) => p.name).join(", "),
            })}
          </small>
        ) : null}
      </span>
    </span>
  );
  const settlement = (
    <SettlementRepresentative person={person} readonly={readonly} trip={trip} />
  );
  const actions = !readonly ? (
    <div className="people-row-actions">
      <RenameParticipant offline={offline} person={person} trip={trip} />
      {blocked ? (
        <Popover.Root>
          <Popover.Trigger>
            <Button
              variant="ghost"
              size="icon"
              aria-label={messages.personRestriction({ name: person.name })}
            >
              <InfoCircledIcon aria-hidden="true" />
            </Button>
          </Popover.Trigger>
          <Popover.Content className="group-details-popover">
            {messages.cannotDeleteReasonUpdateRelatedExpensesFirstOrUseTheMergeToolBelow(
              { reason: blocked },
            )}
          </Popover.Content>
        </Popover.Root>
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
      )}
    </div>
  ) : null;
  return mobile ? (
    <li className="people-row">
      <div className="people-mobile-heading">
        {identity}
        {actions}
      </div>
      {settlement}
    </li>
  ) : (
    <tr>
      <th scope="row">{identity}</th>
      <td>{settlement}</td>
      <td>{actions}</td>
    </tr>
  );
}

function SettlementRepresentative({
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
  const [error, setError] = useLocaleError();
  const [busy, setBusy] = useState(false);
  const hasDependents = trip.participants.some(
    (candidate) => candidate.settledById === person.id,
  );
  const representative = trip.participants.find(
    (candidate) => candidate.id === person.settledById,
  );
  if (readonly) {
    return representative ? (
      <span className="people-settlement text-sm text-muted-foreground">
        {messages.settledByName({ name: representative.name })}
      </span>
    ) : null;
  }
  return (
    <div className="people-settlement grid gap-1">
      <label
        className="text-xs text-muted-foreground"
        htmlFor={`settled-by-${person.id}`}
      >
        {messages.settlementRepresentative}
      </label>
      <select
        id={`settled-by-${person.id}`}
        className="form-control people-settlement-select"
        value={person.settledById ?? ""}
        aria-describedby={
          hasDependents ? `settled-by-reason-${person.id}` : undefined
        }
        disabled={offline || busy || hasDependents}
        onChange={async (event) => {
          setBusy(true);
          setError("");
          try {
            await requestPayload(
              `/api/trips/${trip.id}/participants/${person.id}`,
              {
                body: JSON.stringify({
                  settledById: event.target.value || null,
                }),
                method: "PATCH",
              },
              messages.settlementRepresentativeUpdated,
            );
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : messages.unableToUpdateSettlementRepresentative,
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <option value="">{messages.settleSeparately}</option>
        {trip.participants
          .filter(
            (candidate) => candidate.id !== person.id && !candidate.settledById,
          )
          .map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
      </select>
      {hasDependents ? (
        <span
          className="text-xs text-muted-foreground"
          id={`settled-by-reason-${person.id}`}
        >
          {messages.representativeHasDependents}
        </span>
      ) : null}
      <ActionError message={error} />
    </div>
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
        render={
          <Button
            disabled={offline}
            size="icon"
            variant="ghost"
            aria-label={messages.renameName({ name: person.name })}
          />
        }
      >
        <Pencil aria-hidden="true" />
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
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" className="people-merge-trigger" />}
      >
        <Merge aria-hidden="true" />
        {messages.advancedPeopleTools}
      </DialogTrigger>
      <DialogContent className="responsive-sheet" closeLabel={messages.close}>
        <DialogHeader>
          <DialogTitle>{messages.mergeDuplicatePeople}</DialogTitle>
          <DialogDescription>{messages.advancedPeopleTools}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
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
                  caught instanceof Error
                    ? caught.message
                    : messages.mergeFailed,
                );
              }
            }}
            title={messages.applyMerge}
            trigger={
              <Button variant="outline">{messages.previewAndMerge}</Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
