import type { Trip } from "@narumitw/otter-contracts";
import { expenseCategories } from "@narumitw/otter-core/expense-metadata";
import { currencies } from "@narumitw/otter-core/money";
import {
  MixerHorizontalIcon,
  MagnifyingGlassIcon as Search,
} from "@radix-ui/react-icons";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultExpenseFilters,
  type ExpenseFilters,
} from "../client-support.js";
import { localizeMessage, type Messages, useI18n } from "../i18n.js";
import { useMediaQuery } from "../use-media-query.js";
import { type ExpenseColumn, ExpenseColumnMenu } from "./expense-columns.js";
import type { ExpenseGrouping } from "./expenses-page.js";

export function ExpenseToolbar({
  filters,
  grouping,
  onFiltersChange,
  onGroupingChange,
  columns,
  onColumnsChange,
  trip,
}: {
  filters: ExpenseFilters;
  grouping: ExpenseGrouping;
  onFiltersChange: (filters: ExpenseFilters) => void;
  onGroupingChange: (grouping: ExpenseGrouping) => void;
  columns: ExpenseColumn[];
  onColumnsChange: (columns: ExpenseColumn[]) => void;
  trip: Trip;
}) {
  const { messages } = useI18n();
  const mobile = useMediaQuery("(max-width: 680px)");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const setFilters = (
    update: ExpenseFilters | ((current: ExpenseFilters) => ExpenseFilters),
  ) => onFiltersChange(typeof update === "function" ? update(filters) : update);
  const activeFilters = activeFilterEntries(filters, messages);
  const sortLabels = {
    "date-desc": messages.dateNewestFirst,
    "date-asc": messages.dateOldestFirst,
    "amount-desc": messages.amountHighToLow,
    "amount-asc": messages.amountLowToHigh,
  };
  const groupLabels = {
    date: messages.groupByDate,
    none: messages.noGrouping,
    payer: messages.groupByPayer,
  };
  const sortControls = (
    <div className="expense-sort-controls">
      {" "}
      <label>
        <span className="sr-only">{messages.sort}</span>
        <select
          className="form-control"
          value={filters.sort}
          onChange={(event) =>
            setFilters((value) => ({
              ...value,
              sort: event.target.value as ExpenseFilters["sort"],
            }))
          }
        >
          <option value="date-desc">{messages.dateNewestFirst}</option>
          <option value="date-asc">{messages.dateOldestFirst}</option>
          <option value="amount-desc">{messages.amountHighToLow}</option>
          <option value="amount-asc">{messages.amountLowToHigh}</option>
        </select>
      </label>
      <label>
        <span className="sr-only">{messages.groupBy}</span>
        <select
          className="form-control"
          value={grouping}
          onChange={(event) =>
            onGroupingChange(event.target.value as ExpenseGrouping)
          }
        >
          <option value="none">{messages.noGrouping}</option>
          <option value="date">{messages.groupByDate}</option>
          <option value="payer">{messages.groupByPayer}</option>
        </select>
      </label>
    </div>
  );
  const advancedControls = (
    <>
      {" "}
      <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Filter label={messages.from}>
          <input
            className="form-control"
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                dateFrom: event.target.value,
              }))
            }
          />
        </Filter>
        <Filter label={messages.to}>
          <input
            className="form-control"
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                dateTo: event.target.value,
              }))
            }
          />
        </Filter>
        <Filter label={messages.paidBy}>
          <ParticipantFilter
            trip={trip}
            value={filters.paidById}
            onChange={(paidById) =>
              setFilters((current) => ({ ...current, paidById }))
            }
          />
        </Filter>
        <Filter label={messages.splitWith}>
          <ParticipantFilter
            trip={trip}
            value={filters.participantId}
            onChange={(participantId) =>
              setFilters((current) => ({ ...current, participantId }))
            }
          />
        </Filter>
        <Filter label={messages.currency}>
          <select
            className="form-control"
            value={filters.currency}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                currency: event.target.value,
              }))
            }
          >
            <option value="">{messages.allCurrencies}</option>
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </Filter>
        <Filter label={messages.category}>
          <select
            className="form-control"
            value={filters.category}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                category: event.target.value,
              }))
            }
          >
            <option value="">{messages.allCategories}</option>
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {localizeMessage(category)}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label={messages.tag}>
          <input
            className="form-control"
            placeholder={messages.exactTag}
            value={filters.tag}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                tag: event.target.value,
              }))
            }
          />
        </Filter>
      </div>
    </>
  );
  return (
    <div className="expense-tools">
      <div className="expense-toolbar">
        <label className="relative min-w-0">
          <span className="sr-only">{messages.searchDescriptions}</span>
          <Search
            className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="form-control expense-search-input"
            placeholder={messages.searchExpenseDescriptions}
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                query: event.target.value,
              }))
            }
          />
        </label>
        <Button
          ref={triggerRef}
          variant="outline"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
        >
          <MixerHorizontalIcon aria-hidden="true" />
          {messages.filters}
          {activeFilters.length ? (
            <span className="count-pill">{activeFilters.length}</span>
          ) : null}
        </Button>
        {!mobile ? (
          <>
            {sortControls}
            <ExpenseColumnMenu columns={columns} onChange={onColumnsChange} />
          </>
        ) : null}
      </div>
      {mobile ? (
        <p className="expense-view-status">
          {sortLabels[filters.sort]} · {groupLabels[grouping]}
        </p>
      ) : null}
      {activeFilters.length ? (
        <fieldset className="applied-filters">
          <legend className="sr-only">{messages.applied}</legend>
          {activeFilters.map(([key, label]) => (
            <Button
              key={key}
              variant="secondary"
              size="sm"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  [key]: defaultExpenseFilters[key],
                }))
              }
            >
              {label} ×
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => setFilters({ ...defaultExpenseFilters })}
          >
            {messages.clearAll}
          </Button>
        </fieldset>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="responsive-sheet expense-filter-sheet"
          closeLabel={messages.close}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{messages.filters}</DialogTitle>
            <DialogDescription>
              {messages.datePersonCurrencyCategoryAndTag}
            </DialogDescription>
          </DialogHeader>
          {mobile ? sortControls : null}
          {advancedControls}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setFilters({ ...defaultExpenseFilters })}
            >
              {messages.clearAll}
            </Button>
            <DialogClose render={<Button />}>{messages.done}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Filter({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The caller always supplies a nested form control.
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ParticipantFilter({
  onChange,
  trip,
  value,
}: {
  onChange: (value: string) => void;
  trip: Trip;
  value: string;
}) {
  const { messages } = useI18n();
  return (
    <select
      className="form-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{messages.allPeople}</option>
      {trip.participants.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  );
}

export function activeFilterEntries(
  filters: ExpenseFilters,
  messages: Messages,
): [Exclude<keyof ExpenseFilters, "query" | "sort">, string][] {
  const labels: Record<
    Exclude<keyof ExpenseFilters, "query" | "sort">,
    string
  > = {
    category: messages.categoryValue({
      value: localizeMessage(filters.category),
    }),
    currency: messages.currencyValue({ value: filters.currency }),
    dateFrom: messages.fromValue({ value: filters.dateFrom }),
    dateTo: messages.toValue({ value: filters.dateTo }),
    paidById: messages.paidBy,
    participantId: messages.splitWith,
    tag: messages.tagValue({ value: filters.tag }),
  };
  return (Object.keys(labels) as (keyof typeof labels)[])
    .filter((key) => !!filters[key])
    .map((key) => [key, labels[key]]);
}
