import type { ShareMode, TripShareLink } from "@narumitw/otter-contracts";
import {
  CopyIcon as Copy,
  Link2Icon as Link,
  LockClosedIcon as ShieldCheck,
  TrashIcon as Trash2,
  PersonIcon as UserRoundPlus,
} from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { api, type TripPayload } from "../client-support.js";
import { useI18n } from "../i18n.js";
import { ActionError, useWorkspace } from "./workspace-context.js";
import {
  BusyButton,
  ConfirmDialog,
  FormField,
  SectionHeading,
} from "./workspace-ui.js";

function isUsable(link: TripShareLink, now = Date.now()) {
  return (
    !link.revokedAt && (!link.expiresAt || Date.parse(link.expiresAt) > now)
  );
}

export function AccessSettings({
  payload,
  expanded = false,
}: {
  payload: TripPayload;
  expanded?: boolean;
}) {
  const { messages } = useI18n();
  const { userId } = useWorkspace();
  const [open, setOpen] = useState(expanded);
  const activeLinks = (payload.shareLinks ?? []).filter((link) =>
    isUsable(link),
  ).length;
  return (
    <details
      className="surface disclosure"
      name={expanded ? undefined : "trip-settings"}
      open={expanded || open || undefined}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
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
        {expanded || open ? (
          <ShareLinks key={`${userId}:${payload.trip.id}`} payload={payload} />
        ) : null}
        <Collaborators payload={payload} />
      </div>
    </details>
  );
}

function ShareLinks({ payload }: { payload: TripPayload }) {
  const { messages } = useI18n();
  const { announce, offline, replacePayload, userId } = useWorkspace();
  const queryClient = useQueryClient();
  const queryKey = ["owner-share-links", userId, payload.trip.id] as const;
  const owner = !!userId && payload.currentUserRole === "owner";
  const endpoint = `/api/trips/${payload.trip.id}/share-links`;
  const recovery = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      api<{ shareLinks: TripShareLink[] }>(endpoint, { signal }),
    enabled: owner && !offline,
    gcTime: 0,
    retry: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ShareMode>("readonly");
  const [now, setNow] = useState(Date.now);
  const currentTime = Math.max(now, Date.now());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Expiry must also remove actions while this screen stays open.
  useEffect(() => {
    const expirations = [
      ...(payload.shareLinks ?? []),
      ...(recovery.data?.shareLinks ?? []),
    ]
      .filter((link) => !link.revokedAt && link.expiresAt)
      .map((link) => Date.parse(link.expiresAt ?? ""))
      .filter((time) => time > now);
    if (!expirations.length) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.min(...expirations) - Date.now() + 1, 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [payload.shareLinks, recovery.data, now]);
  const knownLinks = new Map(
    (payload.shareLinks ?? []).map((link) => [link.id, link]),
  );
  // A create can finish after navigation, before the trip metadata refreshes.
  if (owner)
    for (const link of recovery.data?.shareLinks ?? [])
      if (!knownLinks.has(link.id)) knownLinks.set(link.id, link);
  const links = [...knownLinks.values()].map((link) => {
    const recovered = owner
      ? recovery.data?.shareLinks.find(
          (item) => item.id === link.id && item.mode === link.mode,
        )
      : undefined;
    const expiresAt =
      link.expiresAt && recovered?.expiresAt
        ? Date.parse(link.expiresAt) < Date.parse(recovered.expiresAt)
          ? link.expiresAt
          : recovered.expiresAt
        : (link.expiresAt ?? recovered?.expiresAt ?? null);
    const metadata = {
      ...link,
      revokedAt: link.revokedAt ?? recovered?.revokedAt ?? null,
      expiresAt,
    };
    return {
      ...metadata,
      url:
        isUsable(metadata, currentTime) &&
        recovered &&
        isUsable(recovered, currentTime)
          ? recovered.url
          : undefined,
    };
  });

  useEffect(() => {
    if (
      owner &&
      links.some((link) => {
        const current = payload.shareLinks?.find((item) => item.id === link.id);
        return (
          !current ||
          current.revokedAt !== link.revokedAt ||
          (current.expiresAt ?? null) !== link.expiresAt
        );
      })
    )
      replacePayload({
        ...payload,
        shareLinks: links.map(({ url: _url, ...link }) => link),
      });
  }, [links, owner, payload, replacePayload]);

  async function saveResponse(next: TripPayload) {
    await queryClient.cancelQueries({ queryKey, exact: true });
    if (!mounted.current) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
      return;
    }
    const previous = queryClient.getQueryData<{
      shareLinks: TripShareLink[];
    }>(queryKey);
    queryClient.setQueryData(queryKey, {
      shareLinks: (next.shareLinks ?? []).map((link) => ({
        ...link,
        url: isUsable(link)
          ? (link.url ??
            previous?.shareLinks.find(
              (item) =>
                item.id === link.id &&
                item.mode === link.mode &&
                isUsable(item),
            )?.url)
          : undefined,
      })),
    });
    // Capability URLs belong only in the short-lived, account-scoped query.
    replacePayload({
      ...next,
      shareLinks: next.shareLinks?.map(({ url: _url, ...link }) => link),
    });
    void recovery.refetch();
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      if (offline || !owner)
        throw new Error(messages.youAreOfflineReconnectAndTryAgain);
      const previousIds = new Set(payload.shareLinks?.map((link) => link.id));
      const next = await api<TripPayload>(endpoint, {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      await saveResponse(next);
      if (!mounted.current) return;
      announce(messages.shareLinkCreated);
      const url = next.shareLinks?.find(
        (item) =>
          !!item.url &&
          !previousIds.has(item.id) &&
          item.mode === mode &&
          isUsable(item),
      )?.url;
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          announce(messages.shareLinkCreatedAndCopied);
        } catch {
          setError(
            messages.shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually,
          );
          announce(
            messages.shareLinkCreatedYourBrowserBlockedAutomaticCopyingCopyItManually,
          );
        }
      }
    } catch (caught) {
      if (mounted.current)
        setError(
          caught instanceof Error
            ? caught.message
            : messages.unableToCreateLink,
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (offline || !owner)
      throw new Error(messages.youAreOfflineReconnectAndTryAgain);
    const next = await api<TripPayload>(`${endpoint}/${id}`, {
      method: "DELETE",
    });
    await saveResponse(next);
    if (!mounted.current) return;
    announce(messages.shareLinkRevoked);
  }
  async function copy(link: TripShareLink) {
    if (!link.url || !isUsable(link)) return;
    try {
      await navigator.clipboard.writeText(link.url);
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
      <div className="share-link-create">
        {" "}
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
        <ConfirmDialog
          confirmLabel={messages.createShareLink}
          disabled={offline || !owner}
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
            <BusyButton busy={busy}>
              <Link aria-hidden="true" />
              {messages.createShareLink}
            </BusyButton>
          }
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {mode === "readonly"
          ? messages.anyoneWithTheLinkCanViewThisGroupsExpensesBalancesAndSettlementSuggestionsButCannotAddOrChangeData
          : mode === "signed-in-edit"
            ? messages.signedInEditLinkDescription
            : messages.anyoneEditLinkDescription}
      </p>
      {offline ? (
        <p role="status" className="text-sm text-muted-foreground">
          {messages.youAreOfflineReconnectAndTryAgain}
        </p>
      ) : recovery.isPending && owner ? (
        <p role="status" className="text-sm text-muted-foreground">
          {messages.loading}
        </p>
      ) : null}
      {recovery.isError ? (
        <div className="grid gap-2">
          <ActionError
            message={recovery.error.message || messages.loadingFailed}
          />
          <BusyButton
            busy={recovery.isFetching}
            disabled={offline || !owner}
            onClick={() => void recovery.refetch()}
            variant="outline"
          >
            {messages.reload}
          </BusyButton>
        </div>
      ) : null}
      <div className="share-link-table-heading" aria-hidden="true">
        <span>{messages.createdLabel}</span>
        <span>{messages.linkPermission}</span>
        <span>{messages.statusLabel}</span>
        <span>{messages.actions}</span>
      </div>
      <ul className="share-link-list">
        {links.length ? (
          links.map((link) => (
            <li className="share-link-row" key={link.id}>
              <time dateTime={link.createdAt}>
                {link.createdAt.slice(0, 10)}
              </time>
              <span>
                {link.mode === "anyone-edit"
                  ? messages.anyoneEditLink
                  : link.mode === "signed-in-edit"
                    ? messages.signedInEditLink
                    : messages.readOnlyLink}
              </span>
              <span
                className="share-link-status"
                data-active={isUsable(link, currentTime) || undefined}
              >
                {link.revokedAt
                  ? messages.revoked
                  : isUsable(link, currentTime)
                    ? messages.active
                    : messages.shareLinkExpired}
              </span>
              <div className="share-link-actions">
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
                      onClick={() => void copy(link)}
                    >
                      <Copy aria-hidden="true" />
                      {messages.copy}
                    </Button>
                  </>
                ) : null}
                {isUsable(link, currentTime) ? (
                  <ConfirmDialog
                    confirmLabel={messages.revokeLink}
                    disabled={offline || !owner}
                    description={
                      link.mode === "signed-in-edit"
                        ? messages.revokingSignedInLinkDoesNotRemoveExistingCollaborators
                        : messages.afterRevocationTheOldLinkWillImmediatelyStopWorking
                    }
                    destructive
                    onConfirm={() => revoke(link.id)}
                    title={messages.revokeThisShareLink}
                    trigger={
                      <Button
                        className="ml-auto"
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 aria-hidden="true" />
                        {messages.revoke}
                      </Button>
                    }
                  />
                ) : null}
              </div>
              {link.url ? (
                <label className="share-link-address grid gap-2 text-sm">
                  {messages.shareLinkAddress}
                  <input
                    className="form-control"
                    type="text"
                    readOnly
                    value={link.url}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    spellCheck={false}
                  />
                </label>
              ) : isUsable(link, currentTime) &&
                recovery.isSuccess &&
                !offline ? (
                <p className="share-link-address text-sm text-muted-foreground">
                  {messages.shareLinkUnavailable}
                </p>
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
    <details className="disclosure collaborators-section">
      <summary>
        <UserRoundPlus aria-hidden="true" />
        {messages.collaborator}
        <span className="summary-meta">
          {messages.countPeople({ count: payload.collaborators?.length ?? 0 })}
        </span>
      </summary>
      <div className="settings-panel grid gap-4">
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
                {member.role === "owner"
                  ? messages.owner
                  : messages.collaborator}
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
      </div>
    </details>
  );
}
