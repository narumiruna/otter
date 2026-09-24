import type { ShareMode } from "@narumitw/otter-contracts";
import {
  CopyIcon as Copy,
  Link2Icon as Link,
  LockClosedIcon as ShieldCheck,
  TrashIcon as Trash2,
  PersonIcon as UserRoundPlus,
} from "@radix-ui/react-icons";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

export function AccessSettings({ payload }: { payload: TripPayload }) {
  const { messages } = useI18n();
  const activeLinks = (payload.shareLinks ?? []).filter(
    (link) => !link.revokedAt,
  ).length;
  return (
    <details className="surface disclosure" name="trip-settings">
      <summary>
        <ShieldCheck aria-hidden="true" />
        <span>{messages.sharingAndAccess}</span>
        <span className="summary-meta">
          {messages.linksActiveLinksCollaboratorsCollaborators({
            links: activeLinks,
            collaborators: payload.collaborators?.length ?? 0,
          })}
        </span>
      </summary>
      <div className="settings-grid pt-2">
        <ShareLinks payload={payload} />
        <Collaborators payload={payload} />
      </div>
    </details>
  );
}

function ShareLinks({ payload }: { payload: TripPayload }) {
  const { messages } = useI18n();
  const { announce, offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ShareMode>("readonly");
  async function create() {
    setBusy(true);
    setError("");
    try {
      const next = await requestPayload(
        `/api/trips/${payload.trip.id}/share-links`,
        { method: "POST", body: JSON.stringify({ mode }) },
        messages.shareLinkCreated,
      );
      const url = next.shareLinks?.find((item) => item.url)?.url;
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          announce(messages.shareLinkCreatedAndCopied);
        } catch {
          announce(
            messages.shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually,
          );
        }
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.unableToCreateLink,
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      announce(messages.shareLinkCopied);
      setError("");
    } catch {
      setError(
        messages.yourBrowserBlockedCopyingOpenTheLinkAndCopyItFromTheAddressBar,
      );
    }
  }
  return (
    <section className="settings-panel grid gap-4">
      <SectionHeading
        description={messages.chooseWhoCanEditThroughTheShareLink}
      >
        {messages.shareLinks}
      </SectionHeading>
      <ActionError message={error} />
      <label className="grid gap-2 text-sm">
        {messages.linkPermission}
        <select
          className="form-control"
          value={mode}
          onChange={(event) => setMode(event.target.value as ShareMode)}
        >
          <option value="readonly">{messages.readOnlyLink}</option>
          <option value="signed-in-edit">{messages.signedInEditLink}</option>
          <option value="anyone-edit">{messages.anyoneEditLink}</option>
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        {mode === "readonly"
          ? messages.anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData
          : mode === "signed-in-edit"
            ? messages.signedInEditLinkDescription
            : messages.anyoneEditLinkDescription}
      </p>
      <ConfirmDialog
        confirmLabel={messages.createShareLink}
        disabled={offline}
        description={
          mode === "anyone-edit"
            ? messages.anyoneEditLinkDescription
            : mode === "signed-in-edit"
              ? messages.signedInEditLinkDescription
              : messages.anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData
        }
        onConfirm={create}
        title={messages.createAShareLink}
        trigger={
          <BusyButton busy={busy} variant="outline">
            <Link aria-hidden="true" />
            {messages.createShareLink}
          </BusyButton>
        }
      />
      <ul className="settings-list grid gap-2">
        {payload.shareLinks?.length ? (
          payload.shareLinks.map((link) => (
            <li
              className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
              key={link.id}
            >
              <span>
                {link.createdAt.slice(0, 10)} ·{" "}
                {link.mode === "anyone-edit"
                  ? messages.anyoneEditLink
                  : link.mode === "signed-in-edit"
                    ? messages.signedInEditLink
                    : messages.readOnlyLink}{" "}
                · {link.revokedAt ? messages.revoked : messages.active}
              </span>
              {link.url ? (
                <>
                  <a
                    className="break-all text-primary underline"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {messages.openLink}
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy(link.url ?? "")}
                  >
                    <Copy aria-hidden="true" />
                    {messages.copy}
                  </Button>
                </>
              ) : null}
              {!link.revokedAt ? (
                <ConfirmDialog
                  confirmLabel={messages.revokeLink}
                  disabled={offline}
                  description={
                    link.mode === "signed-in-edit"
                      ? messages.revokingSignedInLinkDoesNotRemoveExistingCollaborators
                      : messages.afterRevocationTheOldLinkWillImmediatelyStopWorking
                  }
                  destructive
                  onConfirm={() =>
                    requestPayload(
                      `/api/trips/${payload.trip.id}/share-links/${link.id}`,
                      { method: "DELETE" },
                      messages.shareLinkRevoked,
                    )
                  }
                  title={messages.revokeThisShareLink}
                  trigger={
                    <Button className="ml-auto" size="sm" variant="ghost">
                      <Trash2 aria-hidden="true" />
                      {messages.revoke}
                    </Button>
                  }
                />
              ) : null}
            </li>
          ))
        ) : (
          <li className="empty-copy">{messages.noShareLinksYet}</li>
        )}
      </ul>
    </section>
  );
}

function Collaborators({ payload }: { payload: TripPayload }) {
  const { messages } = useI18n();
  const { offline, requestPayload } = useWorkspace();
  const [error, setError] = useState("");
  const form = useForm<{ username: string }>({
    defaultValues: { username: "" },
  });
  async function add({ username }: { username: string }) {
    setError("");
    try {
      await requestPayload(
        `/api/trips/${payload.trip.id}/members`,
        { body: JSON.stringify({ username }), method: "POST" },
        messages.collaboratorAdded,
        true,
      );
      form.reset();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : messages.unableToAddCollaborator,
      );
    }
  }
  return (
    <section className="settings-panel grid gap-4">
      <SectionHeading
        description={
          messages.collaboratorsMustBeExistingUsersTheyCanManageExpensesAndParticipantsButNotOwnerSettings
        }
      >
        {messages.collaborator}
      </SectionHeading>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={form.handleSubmit(add)}
      >
        <FormField label={messages.existingUsersUsername}>
          <input
            className="form-control"
            type="text"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="friend"
            {...form.register("username", { required: true })}
          />
        </FormField>
        <BusyButton
          busy={form.formState.isSubmitting}
          disabled={offline}
          type="submit"
        >
          <UserRoundPlus aria-hidden="true" />
          {messages.addCollaborator}
        </BusyButton>
      </form>
      <ActionError message={error} />
      <ul className="settings-list grid gap-2">
        {payload.collaborators?.map((member) => (
          <li
            className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
            key={member.userId}
          >
            <span className="min-w-0 flex-1 break-anywhere">
              <strong>{member.name}</strong> · {member.username} ·{" "}
              {member.role === "owner" ? messages.owner : messages.collaborator}
            </span>
            {member.role === "editor" ? (
              <ConfirmDialog
                confirmLabel={messages.removeName({ name: member.name })}
                disabled={offline}
                description={
                  messages.thisAccountWillNoLongerBeAbleToManageTheGroupExistingExpenseDataWillRemain
                }
                destructive
                onConfirm={() =>
                  requestPayload(
                    `/api/trips/${payload.trip.id}/members/${member.userId}`,
                    { method: "DELETE" },
                    messages.collaboratorRemoved,
                    true,
                  )
                }
                title={messages.removeCollaborator}
                trigger={
                  <Button size="sm" variant="ghost">
                    <Trash2 aria-hidden="true" />
                    {messages.remove}
                  </Button>
                }
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
