import {
  ArchiveIcon as Archive,
  ChevronDownIcon as ChevronDown,
  TokensIcon as CircleDollarSign,
  DashboardIcon as LayoutDashboard,
  MixerHorizontalIcon as ListFilter,
  DotsHorizontalIcon as MoreHorizontal,
  PlusIcon as Plus,
  GroupIcon as Users,
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
import {
  readWorkspaceLocation,
  type WorkspaceLocation,
  type WorkspaceView,
  writeWorkspaceLocation,
} from "../url-state.js";
import { RestoreBackup } from "./data-settings.js";
import { ExpenseComposer } from "./expense-composer.js";
import { ExpensesPage } from "./expenses-page.js";
import { MorePage } from "./more-page.js";
import { OverviewPage, SettlementHistory } from "./overview-page.js";
import { PeoplePage } from "./people-page.js";
import { WorkspaceProvider } from "./workspace-context.js";
import { BusyButton, FormField } from "./workspace-ui.js";

type TripCollection = { archivedTrips: TripSummary[]; trips: TripSummary[] };

export function AuthenticatedWorkspace({
  announce,
  bootstrap,
  offline,
}: {
  announce: (message: string) => void;
  bootstrap: AppBootstrap;
  offline: boolean;
}) {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(() =>
    readWorkspaceLocation(new URL(window.location.href)),
  );
  const [draftDirty, setDraftDirty] = useState(false);
  const [filtersByTrip, setFiltersByTrip] = useState<
    Record<string, ExpenseFilters>
  >({});
  const scrollPositions = useRef(new Map<string, number>());
  const [pendingTripId, setPendingTripId] = useState("");
  const [switchError, setSwitchError] = useState("");
  const initialCollection = useMemo<TripCollection>(
    () => ({ archivedTrips: bootstrap.archivedTrips, trips: bootstrap.trips }),
    [bootstrap.archivedTrips, bootstrap.trips],
  );
  const collectionQuery = useQuery({
    initialData: initialCollection,
    queryFn: () => api<TripCollection>("/api/trips"),
    queryKey: ["trips"],
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
    queryKey: ["trip", selectedTripId],
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
      if (
        draftDirty &&
        !window.confirm("尚未儲存的內容會消失。要捨棄草稿嗎？")
      ) {
        window.history.forward();
        return;
      }
      scrollPositions.current.set(pageKey, window.scrollY);
      setDraftDirty(false);
      setLocation(readWorkspaceLocation(new URL(window.location.href)));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [draftDirty, pageKey]);

  useEffect(() => {
    if (selectedTripId !== location.tripId) {
      navigate({ mode: null, tripId: selectedTripId, view: "overview" }, true);
    }
  }, [location.tripId, navigate, selectedTripId]);

  const refreshCollection = useCallback(async () => {
    await collectionQuery.refetch();
  }, [collectionQuery]);

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
      navigate({ mode: null, tripId, view: "overview" });
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "無法切換群組");
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
        <h2>正在載入群組</h2>
        <p>目前選擇會在資料成功載入後顯示。</p>
      </section>
    );
  }
  if (selectedTripId && selectedQuery.isError) {
    return (
      <section className="surface empty-state">
        <h2>無法載入群組</h2>
        <p>
          {selectedQuery.error instanceof Error
            ? selectedQuery.error.message
            : "載入失敗"}
        </p>
        <Button onClick={() => void selectedQuery.refetch()}>重新載入</Button>
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
  const go = (view: WorkspaceView) => navigate({ mode: null, view });
  return (
    <WorkspaceProvider
      announce={announce}
      offline={offline}
      payload={payload}
      refreshCollection={refreshCollection}
    >
      <div className="workspace-layout">
        <aside className="workspace-sidebar" aria-label="群組切換">
          <div className="sidebar-heading">
            <div>
              <span className="sidebar-eyebrow">群組空間</span>
              <h2>群組</h2>
            </div>
            <span
              className="count-pill"
              title={`${collectionQuery.data.trips.length} 個使用中群組`}
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
          <CreateTrip
            onCreated={async (created) => {
              queryClient.setQueryData(["trip", created.trip.id], created);
              await refreshCollection();
              navigate({ mode: null, tripId: created.trip.id, view: "people" });
            }}
            offline={offline}
          />
          {switchError ? (
            <p className="field-error" role="alert">
              {switchError}
            </p>
          ) : null}
        </aside>

        <section className="min-w-0 grid gap-4">
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
              已封存・唯讀。資料會保留；擁有者可到「更多」還原。
            </div>
          ) : null}
          {location.mode || draftDirty ? null : (
            <WorkspaceNavigation
              archived={archived}
              location={location}
              onAdd={() => navigate({ mode: "add-expense" })}
              onNavigate={go}
            />
          )}
          <div id="workspace-content" className="min-w-0" tabIndex={-1}>
            {location.mode === "add-expense" && !archived ? (
              payload.trip.participants.length < 2 &&
              payload.trip.expenses.length === 0 ? (
                <section className="surface empty-state">
                  <h2>先新增同行成員</h2>
                  <p>
                    目前只有一位成員。加入要一起分帳的人，再記錄第一筆共同支出。
                  </p>
                  <Button onClick={() => go("people")}>新增分帳成員</Button>
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
                />
                <SettlementHistory trip={payload.trip} />
              </div>
            ) : location.view === "expenses" ? (
              <ExpensesPage
                filters={
                  filtersByTrip[payload.trip.id] ?? { ...defaultExpenseFilters }
                }
                onAddExpense={() => navigate({ mode: "add-expense" })}
                onDirtyChange={setDraftDirty}
                onFiltersChange={(filters) =>
                  setFiltersByTrip((current) => ({
                    ...current,
                    [payload.trip.id]: filters,
                  }))
                }
                readonly={archived}
                trip={payload.trip}
              />
            ) : location.view === "people" ? (
              <PeoplePage readonly={archived} trip={payload.trip} />
            ) : (
              <MorePage
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
  return (
    <header className="surface trip-header">
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
              <DialogTitle>切換群組</DialogTitle>
              <DialogDescription>
                先載入成功才會離開目前群組。
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
                      {trip.participantCount} 人 · {trip.expenseCount} 筆 ·{" "}
                      {trip.baseCurrency}
                      {trip.archivedAt ? " · 已封存" : ""}
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
            {archived ? <span className="status-badge">已封存</span> : null}
            <span className="status-badge">
              {payload.currentUserRole === "editor" ? "協作者" : "擁有者"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            基準貨幣 {payload.trip.baseCurrency} ·{" "}
            {Object.keys(payload.trip.exchangeRates ?? {}).length
              ? "使用自訂匯率"
              : "使用內建固定匯率"}
            {pendingTripId ? " · 正在載入群組…" : ""}
          </p>
        </div>
      </div>
      <dl className="trip-stats">
        <Stat label="成員" value={payload.trip.participants.length} />
        <Stat label="支出" value={payload.trip.expenses.length} />
        <Stat label="基準" value={payload.trip.baseCurrency} />
      </dl>
    </header>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function WorkspaceNavigation({
  archived,
  location,
  onAdd,
  onNavigate,
}: {
  archived: boolean;
  location: WorkspaceLocation;
  onAdd: () => void;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const items = [
    { icon: LayoutDashboard, label: "總覽", view: "overview" },
    { icon: ListFilter, label: "支出", view: "expenses" },
    { icon: Users, label: "成員", view: "people" },
    { icon: MoreHorizontal, label: "更多", view: "more" },
  ] as const;
  return (
    <nav className="workspace-nav" aria-label="群組工作區">
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
      {!archived ? (
        <Button className="record-expense-button" onClick={onAdd}>
          <Plus aria-hidden="true" />
          記一筆
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
  const row = (trip: TripSummary) => (
    <BusyButton
      aria-current={trip.id === selectedTripId ? "true" : undefined}
      busy={pendingTripId === trip.id}
      busyLabel="載入中…"
      className="trip-switcher-item h-auto w-full justify-start px-3 py-3 text-left"
      data-active={trip.id === selectedTripId || undefined}
      key={trip.id}
      onClick={() => void selectTrip(trip.id)}
      variant={trip.id === selectedTripId ? "secondary" : "ghost"}
    >
      <span className="min-w-0">
        <strong className="block truncate">{trip.name}</strong>
        <span className="text-xs font-normal text-muted-foreground">
          {trip.participantCount} 人 · {trip.expenseCount} 筆 ·{" "}
          {trip.baseCurrency}
        </span>
      </span>
    </BusyButton>
  );
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">{trips.map(row)}</div>
      {archivedTrips.length ? (
        <details className="disclosure compact">
          <summary>
            已封存 <span className="summary-meta">{archivedTrips.length}</span>
          </summary>
          <div className="grid gap-1 pt-2">{archivedTrips.map(row)}</div>
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
      setError(caught instanceof Error ? caught.message : "建立群組失敗");
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
        建立群組
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>建立群組</DialogTitle>
          <DialogDescription>
            建立後先加入同行成員，再記錄共同支出。
          </DialogDescription>
        </DialogHeader>
        <FormField label="群組名稱">
          <input
            className="form-control"
            maxLength={100}
            placeholder="東京五日遊"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label="基準貨幣">
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
          建立群組
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
  return (
    <section className="surface empty-state mx-auto max-w-2xl">
      <CircleDollarSign
        className="mx-auto size-10 text-primary"
        aria-hidden="true"
      />
      <h2>建立第一個群組</h2>
      <p>新增旅行或聚會群組，或從既有 JSON 備份建立新群組。</p>
      <div className="flex flex-wrap justify-center gap-2">
        <CreateTrip onCreated={onCreated} offline={offline} />
      </div>
      <RestoreBackup onRestored={(payload) => void onCreated(payload)} />
    </section>
  );
}
