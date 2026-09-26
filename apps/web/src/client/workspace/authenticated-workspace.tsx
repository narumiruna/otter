import {
  ArchiveIcon as Archive,
  ChevronDownIcon as ChevronDown,
  TokensIcon as CircleDollarSign,
  FileTextIcon,
  GearIcon,
  GlobeIcon,
  DashboardIcon as LayoutDashboard,
  PlusIcon as Plus,
  PersonIcon as Users,
} from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { AppBootstrap } from "../app-bootstrap.js";
import {
  api,
  defaultExpenseFilters,
  type ExpenseFilters,
  type TripPayload,
  type TripSummary,
} from "../client-support.js";
import { useI18n, useLocaleError } from "../i18n.js";
import {
  readWorkspaceLocation,
  type WorkspaceLocation,
  type WorkspaceView,
  writeWorkspaceLocation,
} from "../url-state.js";
import { RestoreBackup } from "./data-settings.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpenseQueuePanel } from "./expense-queue-panel.js";
import { type ExpenseGrouping, ExpensesPage } from "./expenses-page.js";
import { MorePage } from "./more-page.js";
import { OverviewPage, SettlementHistory } from "./overview-page.js";
import { PeoplePage } from "./people-page.js";
import { WebMcpTools } from "./webmcp-tools.js";
import { WorkspaceProvider } from "./workspace-context.js";
import { BusyButton, FormField } from "./workspace-ui.js";

type TripCollection = { archivedTrips: TripSummary[]; trips: TripSummary[] };

function isSameWorkspaceLocation(
  first: WorkspaceLocation,
  second: WorkspaceLocation,
): boolean {
  return (
    first.mode === second.mode &&
    first.tripId === second.tripId &&
    first.view === second.view
  );
}

export function AuthenticatedWorkspace({
  announce,
  bootstrap,
  offline,
  webMcpEnabled = true,
  guestShare = false,
}: {
  announce: (message: string) => void;
  bootstrap: AppBootstrap;
  offline: boolean;
  webMcpEnabled?: boolean;
  guestShare?: boolean;
}) {
  const queryClient = useQueryClient();
  const { messages } = useI18n();
  const [location, setLocation] = useState(() =>
    readWorkspaceLocation(new URL(window.location.href)),
  );
  const [draftDirty, setDraftDirty] = useState(false);
  const draftDirtyRef = useRef(draftDirty);
  draftDirtyRef.current = draftDirty;
  const [recordedEditing, setRecordedEditing] = useState(false);
  const [queuedEditing, setQueuedEditing] = useState(false);
  const [filtersByTrip, setFiltersByTrip] = useState<
    Record<string, ExpenseFilters>
  >({});
  const [groupingByTrip, setGroupingByTrip] = useState<
    Record<string, ExpenseGrouping>
  >({});
  const scrollPositions = useRef(new Map<string, number>());
  const [pendingTripId, setPendingTripId] = useState("");
  const [switchError, setSwitchError] = useLocaleError();
  const initialCollection = useMemo<TripCollection>(
    () => ({ archivedTrips: bootstrap.archivedTrips, trips: bootstrap.trips }),
    [bootstrap.archivedTrips, bootstrap.trips],
  );
  const collectionQuery = useQuery({
    enabled: !guestShare,
    initialData: initialCollection,
    queryFn: () => api<TripCollection>("/api/trips"),
    queryKey: guestShare
      ? ["trips", "share", bootstrap.selected?.trip.id]
      : ["trips"],
    refetchOnWindowFocus: false,
  });
  const allTrips = [
    ...collectionQuery.data.trips,
    ...collectionQuery.data.archivedTrips,
  ];
  const fallbackId =
    collectionQuery.data.trips[0]?.id ??
    collectionQuery.data.archivedTrips[0]?.id ??
    null;
  const selectedTripId = allTrips.some((trip) => trip.id === location.tripId)
    ? location.tripId
    : fallbackId;
  const pageKey = `${selectedTripId ?? "none"}:${location.mode ?? location.view}`;
  const selectedQuery = useQuery({
    enabled: !!selectedTripId,
    initialData:
      bootstrap.selected?.trip.id === selectedTripId
        ? bootstrap.selected
        : undefined,
    queryFn: () => api<TripPayload>(`/api/trips/${selectedTripId}`),
    queryKey: guestShare
      ? ["trip", selectedTripId, "share"]
      : ["trip", selectedTripId],
    refetchOnWindowFocus: false,
  });

  const navigate = useCallback(
    (next: Partial<WorkspaceLocation>, replace = false) => {
      scrollPositions.current.set(pageKey, window.scrollY);
      const merged: WorkspaceLocation = { ...location, ...next };
      const target = writeWorkspaceLocation(
        new URL(window.location.href),
        merged,
      );
      window.history[replace ? "replaceState" : "pushState"]({}, "", target);
      setLocation(merged);
    },
    [location, pageKey],
  );

  useEffect(() => {
    const pop = () => {
      const nextLocation = readWorkspaceLocation(new URL(window.location.href));
      if (isSameWorkspaceLocation(location, nextLocation)) return;
      if (
        draftDirty &&
        !window.confirm(messages.unsavedChangesWillBeLostDiscardTheDraft)
      ) {
        window.history.forward();
        return;
      }
      scrollPositions.current.set(pageKey, window.scrollY);
      setDraftDirty(false);
      setLocation(nextLocation);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [draftDirty, location, messages, pageKey]);

  useEffect(() => {
    if (selectedTripId !== location.tripId) {
      navigate(
        {
          mode: null,
          tripId: selectedTripId,
          view: guestShare ? location.view : "overview",
        },
        true,
      );
    }
  }, [guestShare, location.tripId, location.view, navigate, selectedTripId]);

  const refreshCollection = useCallback(async () => {
    if (!guestShare) await collectionQuery.refetch();
  }, [collectionQuery, guestShare]);

  const updateGuestSummary = useCallback(
    (next: TripPayload) => {
      if (!guestShare) return;
      queryClient.setQueryData<TripCollection>(
        ["trips", "share", bootstrap.selected?.trip.id],
        (current) =>
          current && {
            ...current,
            trips: current.trips.map((trip) =>
              trip.id === next.trip.id
                ? {
                    ...trip,
                    participantCount: next.trip.participants.length,
                    expenseCount: next.trip.expenses.length,
                  }
                : trip,
            ),
          },
      );
    },
    [bootstrap.selected?.trip.id, guestShare, queryClient],
  );

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = "auto";
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({
        behavior: "instant",
        top: scrollPositions.current.get(pageKey) ?? 0,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pageKey]);

  async function selectTrip(tripId: string) {
    if (tripId === selectedTripId) return;
    setPendingTripId(tripId);
    setSwitchError("");
    try {
      await queryClient.fetchQuery({
        queryFn: () => api<TripPayload>(`/api/trips/${tripId}`),
        queryKey: ["trip", tripId],
      });
      // Check after the fetch too: the editor can become dirty while the
      // destination is loading. Both sidebar and mobile switches use this.
      if (
        draftDirtyRef.current &&
        !window.confirm(messages.unsavedChangesWillBeLostDiscardTheDraft)
      )
        return;
      navigate({ mode: null, tripId, view: "overview" });
    } catch (error) {
      setSwitchError(
        error instanceof Error ? error.message : messages.unableToSwitchGroups,
      );
    } finally {
      setPendingTripId("");
    }
  }

  function afterDelete() {
    queryClient.removeQueries({ queryKey: ["trip", selectedTripId] });
    navigate({ mode: null, tripId: null, view: "overview" }, true);
  }

  if (selectedTripId && selectedQuery.isPending) {
    return (
      <section className="surface empty-state" aria-busy="true">
        <h2>{messages.loadingGroup}</h2>
        <p>{messages.yourSelectionWillAppearAfterItsDataLoads}</p>
      </section>
    );
  }
  if (selectedTripId && selectedQuery.isError) {
    return (
      <section className="surface empty-state">
        <h2>{messages.unableToLoadGroup}</h2>
        <p>
          {selectedQuery.error instanceof Error
            ? selectedQuery.error.message
            : messages.loadingFailed}
        </p>
        <Button onClick={() => void selectedQuery.refetch()}>
          {messages.reload}
        </Button>
      </section>
    );
  }
  if (!selectedTripId || !selectedQuery.data) {
    return (
      <NoGroups
        onCreated={async (payload) => {
          queryClient.setQueryData(["trip", payload.trip.id], payload);
          await refreshCollection();
          navigate({ mode: null, tripId: payload.trip.id, view: "people" });
        }}
        offline={offline}
      />
    );
  }

  const payload = selectedQuery.data;
  const archived = !!payload.trip.archivedAt;
  const needsPeople =
    payload.trip.participants.length < 2 && payload.trip.expenses.length === 0;
  const go = (view: WorkspaceView) => navigate({ mode: null, view });
  return (
    <WorkspaceProvider
      announce={announce}
      offline={offline}
      payload={payload}
      refreshCollection={refreshCollection}
      onPayload={updateGuestSummary}
      tripQueryKey={guestShare ? ["trip", selectedTripId, "share"] : undefined}
      userId={guestShare ? undefined : bootstrap.user?.id}
    >
      {webMcpEnabled ? <WebMcpTools tripId={payload.trip.id} /> : null}
      <div className="workspace-layout">
        <aside
          className="workspace-sidebar"
          aria-label={messages.groupSwitcher}
        >
          <div className="sidebar-heading">
            <h2>{messages.groups}</h2>
            <span
              className="count-pill"
              title={messages.countActiveGroups({
                count: collectionQuery.data.trips.length,
              })}
            >
              {collectionQuery.data.trips.length}
            </span>
          </div>
          <TripList
            archivedTrips={collectionQuery.data.archivedTrips}
            pendingTripId={pendingTripId}
            selectedTripId={selectedTripId}
            selectTrip={selectTrip}
            trips={collectionQuery.data.trips}
          />
          {!guestShare ? (
            <CreateTrip
              onCreated={async (created) => {
                queryClient.setQueryData(["trip", created.trip.id], created);
                await refreshCollection();
                navigate({
                  mode: null,
                  tripId: created.trip.id,
                  view: "people",
                });
              }}
              offline={offline || draftDirty}
            />
          ) : null}
          {switchError ? (
            <p className="field-error" role="alert">
              {switchError}
            </p>
          ) : null}
        </aside>

        <section className="workspace-main">
          <TripHeader
            allTrips={allTrips}
            archived={archived}
            payload={payload}
            pendingTripId={pendingTripId}
            selectTrip={selectTrip}
          />
          {archived ? (
            <div className="status-strip" role="status">
              <Archive aria-hidden="true" />
              {
                messages.archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore
              }
            </div>
          ) : null}
          {location.mode || draftDirty ? null : (
            <WorkspaceNavigation
              archived={archived}
              location={location}
              showAdd={
                !needsPeople &&
                !(
                  location.view === "overview" &&
                  payload.trip.expenses.length === 0 &&
                  !payload.trip.settlementPayments?.length
                )
              }
              onAdd={() => navigate({ mode: "add-expense" })}
              onNavigate={go}
            />
          )}
          <div id="workspace-content" className="min-w-0" tabIndex={-1}>
            {!guestShare && location.mode !== "add-expense" ? (
              <ExpenseQueuePanel
                key={selectedTripId}
                onDirtyChange={setDraftDirty}
                onEditingChange={setQueuedEditing}
                otherEditorActive={recordedEditing}
              />
            ) : null}
            {location.mode === "add-expense" && !archived ? (
              needsPeople ? (
                <section className="surface empty-state">
                  <h2>{messages.addTravelCompanionsFirst}</h2>
                  <p>
                    {
                      messages.thereIsOnlyOneParticipantAddSomeoneToSplitWithBeforeRecordingTheFirstExpense
                    }
                  </p>
                  <Button onClick={() => go("people")}>
                    {messages.addExpenseParticipant}
                  </Button>
                </section>
              ) : (
                <ExpenseComposer
                  onCancel={() => navigate({ mode: null })}
                  onDirtyChange={setDraftDirty}
                  onSaved={() => go("expenses")}
                  trip={payload.trip}
                />
              )
            ) : location.view === "overview" ? (
              <div className="grid gap-4">
                <OverviewPage
                  onAddExpense={() => navigate({ mode: "add-expense" })}
                  onPeople={() => go("people")}
                  payload={payload}
                  readonly={archived}
                />
                <SettlementHistory trip={payload.trip} readonly={archived} />
              </div>
            ) : location.view === "expenses" ? (
              !queuedEditing ? (
                <ExpensesPage
                  filters={
                    filtersByTrip[payload.trip.id] ?? {
                      ...defaultExpenseFilters,
                    }
                  }
                  grouping={groupingByTrip[payload.trip.id] ?? "date"}
                  onAddExpense={() =>
                    needsPeople
                      ? go("people")
                      : navigate({ mode: "add-expense" })
                  }
                  onDirtyChange={setDraftDirty}
                  onEditingChange={setRecordedEditing}
                  onFiltersChange={(filters) =>
                    setFiltersByTrip((current) => ({
                      ...current,
                      [payload.trip.id]: filters,
                    }))
                  }
                  onGroupingChange={(grouping) =>
                    setGroupingByTrip((current) => ({
                      ...current,
                      [payload.trip.id]: grouping,
                    }))
                  }
                  readonly={archived}
                  trip={payload.trip}
                  userId={bootstrap.user?.id ?? "current"}
                />
              ) : null
            ) : location.view === "people" ? (
              <PeoplePage readonly={archived} trip={payload.trip} />
            ) : (
              <MorePage
                guestShare={guestShare}
                onDeleted={afterDelete}
                onRestored={(restored) =>
                  navigate({
                    mode: null,
                    tripId: restored.trip.id,
                    view: "overview",
                  })
                }
                payload={payload}
              />
            )}
          </div>
        </section>
      </div>
    </WorkspaceProvider>
  );
}

function TripHeader({
  allTrips,
  archived,
  payload,
  pendingTripId,
  selectTrip,
}: {
  allTrips: TripSummary[];
  archived: boolean;
  payload: TripPayload;
  pendingTripId: string;
  selectTrip: (id: string) => Promise<void>;
}) {
  const { messages } = useI18n();
  return (
    <header className="trip-header">
      <div className="mobile-group-switch">
        <Dialog>
          <DialogTrigger
            render={
              <Button className="w-full justify-between" variant="outline" />
            }
          >
            <span className="min-w-0 truncate">{payload.trip.name}</span>
            <ChevronDown aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="top-auto bottom-0 max-h-[85dvh] w-full max-w-none translate-y-0 rounded-b-none sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-y-1/2 sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>{messages.switchGroups}</DialogTitle>
              <DialogDescription>
                {messages.youWillLeaveTheCurrentGroupOnlyAfterTheNewOneLoads}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {allTrips.map((trip) => (
                <DialogClose
                  key={trip.id}
                  render={
                    <Button
                      className="h-auto justify-start py-3 text-left"
                      variant={
                        trip.id === payload.trip.id ? "secondary" : "ghost"
                      }
                    />
                  }
                  onClick={() => void selectTrip(trip.id)}
                >
                  <span>
                    <strong className="block">{trip.name}</strong>
                    <span className="text-xs text-muted-foreground">
                      {messages.participantsPeopleExpensesExpensesCurrency({
                        participants: trip.participantCount,
                        expenses: trip.expenseCount,
                        currency: trip.baseCurrency,
                      })}
                      {trip.archivedAt ? ` · ${messages.archived}` : ""}
                    </span>
                  </span>
                </DialogClose>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="trip-heading">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight break-anywhere">
              {payload.trip.name}
            </h2>
            {archived ? (
              <span className="status-badge">{messages.archived}</span>
            ) : null}
            <span className="status-badge">
              {payload.currentUserRole === "editor"
                ? messages.collaborator
                : messages.owner}
            </span>
          </div>
          <p className="trip-description">
            <GlobeIcon aria-hidden="true" />
            <span>
              {messages.baseCurrencyCurrency({
                currency: payload.trip.baseCurrency,
              })}{" "}
              ·{" "}
              {payload.exchangeRateInfo?.source === "custom"
                ? messages.usingCustomExchangeRates
                : payload.exchangeRateInfo?.source === "bank"
                  ? messages.usingBankOfTaiwanExchangeRates
                  : messages.usingFixedFallbackRates}
              {pendingTripId ? ` · ${messages.loadingGroup2}` : ""}
            </span>
          </p>
        </div>
      </div>
    </header>
  );
}
function WorkspaceNavigation({
  archived,
  location,
  onAdd,
  onNavigate,
  showAdd,
}: {
  archived: boolean;
  showAdd: boolean;
  location: WorkspaceLocation;
  onAdd: () => void;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const { messages } = useI18n();
  const items = [
    { icon: LayoutDashboard, label: messages.overview, view: "overview" },
    { icon: FileTextIcon, label: messages.expenses, view: "expenses" },
    { icon: Users, label: messages.people, view: "people" },
    { icon: GearIcon, label: messages.groupSettings, view: "more" },
  ] as const;
  return (
    <nav className="workspace-nav" aria-label={messages.groupWorkspace}>
      {items.map(({ icon: Icon, label, view }) => (
        <Button
          aria-current={
            !location.mode && location.view === view ? "page" : undefined
          }
          className="workspace-nav-item"
          key={view}
          onClick={() => onNavigate(view)}
          variant={
            !location.mode && location.view === view ? "secondary" : "ghost"
          }
        >
          <Icon aria-hidden="true" />
          {label}
        </Button>
      ))}
      {!archived && showAdd ? (
        <Button className="record-expense-button" onClick={onAdd}>
          <Plus aria-hidden="true" />
          {messages.addExpense}
        </Button>
      ) : null}
    </nav>
  );
}

function TripList({
  archivedTrips,
  pendingTripId,
  selectedTripId,
  selectTrip,
  trips,
}: {
  archivedTrips: TripSummary[];
  pendingTripId: string;
  selectedTripId: string;
  selectTrip: (id: string) => Promise<void>;
  trips: TripSummary[];
}) {
  const { messages } = useI18n();
  const row = (trip: TripSummary) => (
    <BusyButton
      aria-current={trip.id === selectedTripId ? "true" : undefined}
      busy={pendingTripId === trip.id}
      busyLabel={messages.loading}
      className="trip-switcher-item"
      title={trip.name}
      data-active={trip.id === selectedTripId || undefined}
      key={trip.id}
      onClick={() => void selectTrip(trip.id)}
      variant={trip.id === selectedTripId ? "secondary" : "ghost"}
    >
      <span className="trip-list-icon" aria-hidden="true">
        <GlobeIcon />
      </span>
      <span className="trip-list-copy">
        <strong>{trip.name}</strong>
        <small>
          {messages.participantsPeopleExpensesExpensesCurrency({
            participants: trip.participantCount,
            expenses: trip.expenseCount,
            currency: trip.baseCurrency,
          })}
        </small>
      </span>
    </BusyButton>
  );
  return (
    <div className="trip-list">
      <div className="trip-list">{trips.map(row)}</div>
      {archivedTrips.length ? (
        <details className="disclosure compact">
          <summary>
            {messages.archivedGroups}{" "}
            <span className="summary-meta">{archivedTrips.length}</span>
          </summary>
          <div className="trip-list">{archivedTrips.map(row)}</div>
        </details>
      ) : null}
    </div>
  );
}

function CreateTrip({
  onCreated,
  offline,
}: {
  onCreated: (payload: TripPayload) => void | Promise<void>;
  offline: boolean;
}) {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("TWD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    try {
      const created = await api<TripPayload>("/api/trips", {
        body: JSON.stringify({ baseCurrency, name }),
        method: "POST",
      });
      await onCreated(created);
      setOpen(false);
      setName("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : messages.unableToCreateGroup,
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
          <Button className="w-full" disabled={offline} variant="outline" />
        }
      >
        <Plus aria-hidden="true" />
        {messages.createGroup}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.createGroup}</DialogTitle>
          <DialogDescription>
            {
              messages.addCompanionsAfterCreatingTheGroupThenRecordSharedExpenses
            }
          </DialogDescription>
        </DialogHeader>
        <FormField label={messages.groupName}>
          <input
            className="form-control"
            maxLength={100}
            placeholder={messages.fiveDaysInTokyo}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label={messages.baseCurrency}>
          <select
            className="form-control"
            value={baseCurrency}
            onChange={(event) => setBaseCurrency(event.target.value)}
          >
            <option>TWD</option>
            <option>JPY</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </FormField>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <BusyButton
          busy={busy}
          disabled={offline || !name.trim()}
          onClick={() => void create()}
        >
          {messages.createGroup}
        </BusyButton>
      </DialogContent>
    </Dialog>
  );
}

function NoGroups({
  onCreated,
  offline,
}: {
  onCreated: (payload: TripPayload) => void | Promise<void>;
  offline: boolean;
}) {
  const { messages } = useI18n();
  return (
    <section className="surface empty-state mx-auto max-w-2xl">
      <CircleDollarSign
        className="mx-auto size-10 text-primary"
        aria-hidden="true"
      />
      <h2>{messages.createYourFirstGroup}</h2>
      <p>{messages.addATripOrEventGroupOrCreateOneFromAnExistingJsonBackup}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <CreateTrip onCreated={onCreated} offline={offline} />
      </div>
      <RestoreBackup onRestored={(payload) => void onCreated(payload)} />
    </section>
  );
}
