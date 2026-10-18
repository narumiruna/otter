import { currencies } from "@narumitw/otter-core/money";
import {
  ArchiveIcon as Archive,
  TokensIcon as CircleDollarSign,
  PlusIcon as Plus,
} from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import type { WorkspaceView } from "../url-state.js";
import { getHistorySnapshot, saveHistoryPage } from "../workspace-history.js";
import { RestoreBackup } from "./data-settings.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpenseQueuePanel } from "./expense-queue-panel.js";
import { type ExpenseGrouping, ExpensesPage } from "./expenses-page.js";
import { MorePage } from "./more-page.js";
import { OrphanedExpenseQueue } from "./orphaned-expense-queue.js";
import { OverviewPage, SettlementHistory } from "./overview-page.js";
import { PeoplePage } from "./people-page.js";
import { SpendingAnalysisPage } from "./spending-analysis-page.js";
import { useWorkspaceNavigation } from "./use-workspace-navigation.js";
import { WebMcpTools } from "./webmcp-tools.js";
import { WorkspaceProvider } from "./workspace-context.js";
import {
  TripHeader,
  TripList,
  WorkspaceNavigation,
} from "./workspace-layout.js";
import { BusyButton, ConfirmDialog, FormField } from "./workspace-ui.js";

type TripCollection = { archivedTrips: TripSummary[]; trips: TripSummary[] };

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
  const [draftDirty, setDraftDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const capturePageRef = useRef<(focusExpenseId?: string) => void>(() => {});
  const navigation = useWorkspaceNavigation({
    dirty: draftDirty,
    busy: submitting,
    capturePage: () => capturePageRef.current(),
    discardMessage: messages.unsavedChangesWillBeLostDiscardTheDraft,
  });
  const { location, navigate, workspaceEntryKey } = navigation;
  const authBlockedFor = useRef<string | null>(null);
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
    queryFn: ({ signal }) => api<TripCollection>("/api/trips", { signal }),
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
  const pageKey = `${selectedTripId ?? "none"}:${location.mode ?? location.view}:${location.expenseId ?? ""}`;
  const restoring = useRef(false);
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

  const editorLoadKey =
    location.mode === "edit-expense"
      ? `${workspaceEntryKey}:${navigation.workspaceActivation}:${location.tripId}:${location.expenseId}`
      : null;
  const [checkedEditor, setCheckedEditor] = useState<string | null>(null);
  useEffect(() => {
    if (!editorLoadKey || selectedTripId !== location.tripId) return;
    if (offline) {
      setCheckedEditor(editorLoadKey);
      return;
    }
    let active = true;
    void queryClient
      .fetchQuery({
        queryKey: guestShare
          ? ["trip", selectedTripId, "share"]
          : ["trip", selectedTripId],
        queryFn: ({ signal }) =>
          api<TripPayload>(`/api/trips/${selectedTripId}`, { signal }),
        staleTime: 0,
      })
      .then(() => {
        if (active) setCheckedEditor(editorLoadKey);
      })
      .catch(() => {
        /* The trip query renders its error and retry controls. */
      });
    return () => {
      active = false;
    };
  }, [
    editorLoadKey,
    selectedTripId,
    location.tripId,
    offline,
    queryClient,
    guestShare,
  ]);

  capturePageRef.current = (focusExpenseId) => {
    if (
      restoring.current ||
      document.querySelector("#workspace-content")?.closest("[hidden]")
    )
      return;
    scrollPositions.current.set(pageKey, window.scrollY);
    const previous = getHistorySnapshot().entry.page;
    saveHistoryPage({
      pageKey,
      scrollY: window.scrollY,
      ...(!location.mode && location.view === "expenses" && selectedTripId
        ? {
            list: {
              tripId: selectedTripId,
              filters: filtersByTrip[selectedTripId] ?? {
                ...defaultExpenseFilters,
              },
              grouping: groupingByTrip[selectedTripId] ?? "date",
              focusExpenseId: focusExpenseId ?? previous?.list?.focusExpenseId,
            },
          }
        : {}),
    });
  };
  useEffect(() => {
    const capture = () => capturePageRef.current();
    window.addEventListener("scroll", capture, { passive: true });
    return () => window.removeEventListener("scroll", capture);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Persist UI changes using the latest capture callback, not every render.
  useEffect(() => {
    capturePageRef.current();
  }, [filtersByTrip, groupingByTrip]);

  useEffect(() => {
    if (
      selectedTripId !== location.tripId &&
      location.mode !== "edit-expense"
    ) {
      navigate(
        {
          mode: null,
          tripId: selectedTripId,
          view: guestShare ? location.view : "overview",
        },
        true,
      );
    }
  }, [
    guestShare,
    location.mode,
    location.tripId,
    location.view,
    navigate,
    selectedTripId,
  ]);

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

  const editorLoaded = !editorLoadKey || checkedEditor === editorLoadKey;
  const ready =
    !!selectedQuery.data && !selectedQuery.isPending && editorLoaded;
  useLayoutEffect(() => {
    if (!ready) return;
    restoring.current = true;
    const entry = getHistorySnapshot();
    const page =
      entry.entry.key === workspaceEntryKey ? entry.entry.page : undefined;
    const saved = page?.pageKey === pageKey ? page : undefined;
    if (saved?.list) {
      const list = saved.list;
      setFiltersByTrip((current) => ({
        ...current,
        [list.tripId]: list.filters,
      }));
      setGroupingByTrip((current) => ({
        ...current,
        [list.tripId]: list.grouping,
      }));
    }
    let interacted = false;
    const markInteraction = () => {
      interacted = true;
    };
    document.addEventListener("pointerdown", markInteraction, true);
    document.addEventListener("keydown", markInteraction, true);
    document.addEventListener("wheel", markInteraction, { passive: true });
    const frame = requestAnimationFrame(() => {
      if (!interacted) {
        if (!location.mode && location.view === "expenses") {
          const id = saved?.list?.focusExpenseId;
          const target = id
            ? Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                  "[data-expense-id] button",
                ),
              ).find(
                (button) =>
                  button.closest<HTMLElement>("[data-expense-id]")?.dataset
                    .expenseId === id && button.getClientRects().length > 0,
              )
            : undefined;
          (target ?? document.getElementById("expenses-heading"))?.focus({
            preventScroll: true,
          });
        }
        window.scrollTo({
          behavior: "instant",
          top: saved?.scrollY ?? scrollPositions.current.get(pageKey) ?? 0,
        });
      }
      restoring.current = false;
      document.removeEventListener("pointerdown", markInteraction, true);
      document.removeEventListener("keydown", markInteraction, true);
      document.removeEventListener("wheel", markInteraction);
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", markInteraction, true);
      document.removeEventListener("keydown", markInteraction, true);
      document.removeEventListener("wheel", markInteraction);
      restoring.current = false;
    };
  }, [workspaceEntryKey, pageKey, ready, location.mode, location.view]);

  async function selectTrip(tripId: string) {
    if (tripId === selectedTripId) return;
    setPendingTripId(tripId);
    setSwitchError("");
    try {
      await queryClient.fetchQuery({
        queryFn: () => api<TripPayload>(`/api/trips/${tripId}`),
        queryKey: ["trip", tripId],
      });
      // navigate checks the current dirty/busy state after this fetch.
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
        <Button
          onClick={() =>
            void selectedQuery.refetch().then((result) => {
              if (result.isSuccess && editorLoadKey)
                setCheckedEditor(editorLoadKey);
            })
          }
        >
          {messages.reload}
        </Button>
        {location.mode === "edit-expense" ? (
          <Button
            type="button"
            onClick={() =>
              navigate({ mode: null, view: "expenses", tripId: null }, true)
            }
          >
            {messages.backToExpenseList}
          </Button>
        ) : null}
      </section>
    );
  }
  if (
    (!selectedTripId || !selectedQuery.data) &&
    location.mode === "edit-expense"
  ) {
    return (
      <section className="surface empty-state">
        <h2>{messages.expenseEditorUnavailable}</h2>
        <Button
          type="button"
          onClick={() =>
            navigate({ mode: null, view: "expenses", tripId: null }, true)
          }
        >
          {messages.backToExpenseList}
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
        trips={allTrips}
        userId={guestShare ? undefined : bootstrap.user?.id}
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
      key={`${guestShare ? "guest" : bootstrap.user?.id}:${selectedTripId}`}
      announce={announce}
      authBlockedFor={authBlockedFor}
      offline={offline}
      payload={payload}
      refreshCollection={refreshCollection}
      onPayload={updateGuestSummary}
      tripQueryKey={guestShare ? ["trip", selectedTripId, "share"] : undefined}
      userId={guestShare ? undefined : bootstrap.user?.id}
    >
      <ConfirmDialog
        open={navigation.pending}
        onOpenChange={(open) => {
          if (!open) navigation.cancelPending();
        }}
        onConfirm={navigation.confirmPending}
        onCloseAutoFocus={(event) => {
          if (!navigation.pending) event.preventDefault();
        }}
        title={messages.discardThisDraft}
        description={messages.unsavedChangesWillBeLost}
        confirmLabel={messages.discardDraft}
        destructive
      />
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
          {!guestShare ? (
            <OrphanedExpenseQueue
              trips={allTrips}
              userId={bootstrap.user?.id}
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
            onAdd={() => navigate({ mode: "add-expense" })}
            showAdd={
              !archived &&
              !needsPeople &&
              !location.mode &&
              !draftDirty &&
              !(
                location.view === "overview" &&
                !payload.trip.expenses.length &&
                !payload.trip.settlementPayments?.length
              )
            }
            groupActions={
              !guestShare ? (
                <CreateTrip
                  offline={offline || draftDirty}
                  onCreated={async (created) => {
                    queryClient.setQueryData(
                      ["trip", created.trip.id],
                      created,
                    );
                    await refreshCollection();
                    navigate({
                      mode: null,
                      tripId: created.trip.id,
                      view: "people",
                    });
                  }}
                />
              ) : null
            }
          />
          {archived ? (
            <div className="status-strip" role="status">
              <Archive aria-hidden="true" />
              {
                messages.archivedAndReadOnlyDataIsPreservedTheOwnerCanRestoreItUnderMore
              }
            </div>
          ) : null}
          {location.mode ||
          draftDirty ||
          recordedEditing ||
          queuedEditing ? null : (
            <WorkspaceNavigation
              archived={archived}
              location={location}
              showAdd
              onAdd={() => navigate({ mode: "add-expense" })}
              onNavigate={go}
            />
          )}
          <div id="workspace-content" className="min-w-0" tabIndex={-1}>
            {!guestShare && location.mode !== "add-expense" ? (
              <ExpenseQueuePanel
                key={selectedTripId}
                onDirtyChange={setDraftDirty}
                onBusyChange={setSubmitting}
                onEditingChange={setQueuedEditing}
                otherEditorActive={
                  recordedEditing || location.mode === "edit-expense"
                }
              />
            ) : null}
            {location.mode === "edit-expense" ? (
              !editorLoaded && selectedTripId === location.tripId ? (
                <section className="surface empty-state" aria-busy="true">
                  <h2>{messages.loadingGroup}</h2>
                </section>
              ) : selectedTripId === location.tripId &&
                !archived &&
                !payload.readonly &&
                payload.trip.expenses.some(
                  (expense) => expense.id === location.expenseId,
                ) ? (
                <ExpenseComposer
                  key={`${workspaceEntryKey}:${location.expenseId}`}
                  expense={payload.trip.expenses.find(
                    (expense) => expense.id === location.expenseId,
                  )}
                  onCancel={() => navigation.exitEditor()}
                  onSaved={() => navigation.exitEditor(true)}
                  onDirtyChange={setDraftDirty}
                  onBusyChange={setSubmitting}
                  trip={payload.trip}
                />
              ) : (
                <section className="surface empty-state">
                  <h2>{messages.expenseEditorUnavailable}</h2>
                  <Button
                    type="button"
                    onClick={() => {
                      if (selectedTripId === location.tripId)
                        navigation.exitEditor();
                      else
                        navigate(
                          {
                            mode: null,
                            tripId: selectedTripId,
                            view: "expenses",
                          },
                          true,
                        );
                    }}
                  >
                    {messages.backToExpenseList}
                  </Button>
                </section>
              )
            ) : location.mode === "add-expense" && !archived ? (
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
                  key={`add-expense:${workspaceEntryKey}`}
                  onCancel={() => navigate({ mode: null }, false, true)}
                  onDirtyChange={setDraftDirty}
                  onBusyChange={setSubmitting}
                  onSaved={() => navigation.exitEditor(true)}
                  trip={payload.trip}
                />
              )
            ) : location.view === "overview" ? (
              <div className="grid gap-4">
                <OverviewPage
                  onAddExpense={() => navigate({ mode: "add-expense" })}
                  onEditExpense={
                    queuedEditing
                      ? undefined
                      : (expense) => {
                          navigate({
                            mode: "edit-expense",
                            expenseId: expense.id,
                            view: "expenses",
                          });
                        }
                  }
                  onPeople={() => go("people")}
                  onExpenses={() => go("expenses")}
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
                  onEditExpense={(expense) => {
                    capturePageRef.current(expense.id);
                    navigate({
                      mode: "edit-expense",
                      expenseId: expense.id,
                      view: "expenses",
                    });
                  }}
                  onAddExpense={() =>
                    needsPeople
                      ? go("people")
                      : navigate({ mode: "add-expense" })
                  }
                  onDirtyChange={setDraftDirty}
                  onBusyChange={setSubmitting}
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
            ) : location.view === "analysis" ? (
              <SpendingAnalysisPage payload={payload} />
            ) : location.view === "people" ? (
              <PeoplePage readonly={archived} trip={payload.trip} />
            ) : (
              <MorePage
                copyDisabled={draftDirty}
                guestShare={guestShare}
                onCopied={async (copied) => {
                  await queryClient.cancelQueries({
                    queryKey: ["trips"],
                    exact: true,
                  });
                  queryClient.setQueryData(["trip", copied.trip.id], copied);
                  queryClient.setQueryData<TripCollection>(
                    ["trips"],
                    (current) =>
                      current && {
                        ...current,
                        trips: current.trips.some(
                          (trip) => trip.id === copied.trip.id,
                        )
                          ? current.trips
                          : [
                              ...current.trips,
                              {
                                baseCurrency: copied.trip.baseCurrency,
                                expenseCount: 0,
                                id: copied.trip.id,
                                name: copied.trip.name,
                                participantCount:
                                  copied.trip.participants.length,
                              },
                            ],
                      },
                  );
                  navigate({
                    mode: null,
                    tripId: copied.trip.id,
                    view: "overview",
                  });
                }}
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
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
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
  trips,
  userId,
}: {
  onCreated: (payload: TripPayload) => void | Promise<void>;
  offline: boolean;
  trips: TripSummary[];
  userId?: string;
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
      {userId ? <OrphanedExpenseQueue trips={trips} userId={userId} /> : null}
    </section>
  );
}
