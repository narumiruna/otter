import type { TripPayload } from "@narumitw/otter-contracts";
import { useEffect } from "react";
import { api } from "../client-support.js";

const maxEntries = 8;
const maxNameLength = 48;
// Never reuse a name in the same document: Chrome can resolve a previously
// discovered tool by name after a new group registers its replacement.
let nextRegistrationId = 0;

function shortName(name: string): string {
  return name.slice(0, maxNameLength);
}

export function balanceToolResult(payload: TripPayload): string {
  return JSON.stringify({
    trip: shortName(payload.trip.name),
    currency: payload.trip.baseCurrency,
    unit: "minor",
    total: payload.balances.length,
    balances: payload.balances.slice(0, maxEntries).map((balance) => ({
      name: shortName(balance.name),
      amountMinor: balance.amountMinor,
      currency: balance.currency,
    })),
    truncated: payload.balances.length > maxEntries,
  });
}

export function settlementToolResult(payload: TripPayload): string {
  return JSON.stringify({
    trip: shortName(payload.trip.name),
    currency: payload.trip.baseCurrency,
    unit: "minor",
    total: payload.settlements.length,
    settlements: payload.settlements.slice(0, maxEntries).map((entry) => ({
      from: shortName(entry.fromName),
      to: shortName(entry.toName),
      amountMinor: entry.amountMinor,
      currency: entry.currency,
    })),
    truncated: payload.settlements.length > maxEntries,
  });
}

type ReadonlyTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, never>;
    additionalProperties: false;
  };
  annotations: { readOnlyHint: true; untrustedContentHint: true };
  execute: () => Promise<string>;
};

type ModelContext = {
  registerTool: (
    tool: ReadonlyTool,
    options: { signal: AbortSignal },
  ) => Promise<void>;
};

function getModelContext(): ModelContext | null {
  const context: unknown = Reflect.get(document, "modelContext");
  if (
    !context ||
    typeof context !== "object" ||
    !("registerTool" in context) ||
    typeof context.registerTool !== "function"
  ) {
    return null;
  }
  return context as ModelContext;
}

export function WebMcpTools({ tripId }: { tripId: string }) {
  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    const registrationId = ++nextRegistrationId;
    const readCurrentTrip = async () => {
      if (controller.signal.aborted) throw new Error("Group has changed");
      const payload = await api<TripPayload>(
        `/api/trips/${encodeURIComponent(tripId)}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted || payload.trip.id !== tripId) {
        throw new Error("Group has changed");
      }
      return payload;
    };
    const common = {
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false as const,
      },
      annotations: {
        readOnlyHint: true as const,
        untrustedContentHint: true as const,
      },
    };
    const tools: ReadonlyTool[] = [
      {
        ...common,
        name: `trip_balances_${registrationId}`,
        description:
          "Read the current group's participant balances. Amounts are signed minor currency units. No changes are made.",
        execute: async () => balanceToolResult(await readCurrentTrip()),
      },
      {
        ...common,
        name: `trip_settlements_${registrationId}`,
        description:
          "Read suggested payments for the current group. Amounts are minor currency units; no payment is recorded.",
        execute: async () => settlementToolResult(await readCurrentTrip()),
      },
    ];
    void Promise.all(
      tools.map((tool) =>
        Promise.resolve().then(() => {
          if (controller.signal.aborted) return;
          return modelContext.registerTool(tool, { signal: controller.signal });
        }),
      ),
    ).catch(() => controller.abort());

    return () => controller.abort();
  }, [tripId]);

  return null;
}
