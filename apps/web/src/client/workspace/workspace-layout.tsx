import {
  ChevronDownIcon as ChevronDown,
  FileTextIcon,
  GearIcon,
  GlobeIcon,
  InfoCircledIcon,
  DashboardIcon as LayoutDashboard,
  PlusIcon as Plus,
  PersonIcon as Users,
} from "@radix-ui/react-icons";
import { Popover } from "@radix-ui/themes";
import type { ReactNode } from "react";
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
import type { TripPayload, TripSummary } from "../client-support.js";
import { useI18n } from "../i18n.js";
import type { WorkspaceLocation, WorkspaceView } from "../url-state.js";
import { useMediaQuery } from "../use-media-query.js";
import { BusyButton } from "./workspace-ui.js";

export function TripHeader({
  allTrips,
  archived,
  payload,
  pendingTripId,
  selectTrip,
  onAdd,
  showAdd,
  groupActions,
}: {
  onAdd: () => void;
  showAdd: boolean;
  groupActions?: ReactNode;
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
              <Button
                className="group-switch-trigger"
                variant="outline"
                aria-label={messages.switchGroups}
              />
            }
          >
            <GlobeIcon aria-hidden="true" />
            <span className="min-w-0 truncate">{payload.trip.name}</span>
            <ChevronDown aria-hidden="true" />
          </DialogTrigger>
          <DialogContent
            className="responsive-sheet"
            closeLabel={messages.close}
          >
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
            {groupActions}
          </DialogContent>
        </Dialog>
      </div>
      <div className="trip-heading">
        <div className="min-w-0">
          <div className="desktop-trip-title flex flex-wrap items-center gap-2">
            <h2 className="font-semibold tracking-tight break-anywhere">
              {payload.trip.name}
            </h2>
            <span className="status-badge">
              {archived
                ? messages.archived
                : payload.currentUserRole === "editor"
                  ? messages.collaborator
                  : messages.owner}
            </span>
          </div>
          <div className="trip-description">
            <span className="desktop-trip-meta">
              {messages.participantsPeopleExpensesExpensesCurrency({
                participants: payload.trip.participants.length,
                expenses: payload.trip.expenses.length,
                currency: payload.trip.baseCurrency,
              })}
            </span>
            <span className="mobile-trip-meta">
              {messages.countPeople({
                count: payload.trip.participants.length,
              })}{" "}
              · {payload.trip.baseCurrency}
            </span>
            <span className="desktop-rate-source">
              {payload.exchangeRateInfo?.source === "custom"
                ? messages.usingCustomExchangeRates
                : payload.exchangeRateInfo?.source === "bank"
                  ? messages.usingBankOfTaiwanExchangeRates
                  : messages.usingFixedFallbackRates}
            </span>
            <Popover.Root>
              <Popover.Trigger>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={messages.groupDetails}
                >
                  <InfoCircledIcon aria-hidden="true" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="group-details-popover">
                <strong>{messages.groupDetails}</strong>
                <p>
                  {archived
                    ? messages.archived
                    : payload.currentUserRole === "editor"
                      ? messages.collaborator
                      : messages.owner}
                </p>
                <p>
                  {messages.baseCurrencyCurrency({
                    currency: payload.trip.baseCurrency,
                  })}
                </p>
                <p>
                  {payload.exchangeRateInfo?.source === "custom"
                    ? messages.usingCustomExchangeRates
                    : payload.exchangeRateInfo?.source === "bank"
                      ? messages.usingBankOfTaiwanExchangeRates
                      : messages.usingFixedFallbackRates}
                </p>
              </Popover.Content>
            </Popover.Root>
            {pendingTripId ? (
              <span role="status">{messages.loadingGroup2}</span>
            ) : null}
          </div>
        </div>
      </div>
      {showAdd ? (
        <Button className="desktop-add-expense" onClick={onAdd}>
          <Plus aria-hidden="true" />
          {messages.addExpense}
        </Button>
      ) : null}
    </header>
  );
}
export function WorkspaceNavigation({
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
  const mobile = useMediaQuery("(max-width: 680px)");
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
          aria-label={label}
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
          <span className="desktop-nav-label">{label}</span>
          <span className="mobile-nav-label">
            {view === "more" ? messages.settingsShort : label}
          </span>
        </Button>
      ))}
      {showAdd && mobile ? (
        <Button
          className="record-expense-button"
          disabled={archived}
          onClick={onAdd}
          aria-label={messages.addExpense}
        >
          <Plus aria-hidden="true" />
          {messages.addShort}
        </Button>
      ) : null}
    </nav>
  );
}

export function TripList({
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
