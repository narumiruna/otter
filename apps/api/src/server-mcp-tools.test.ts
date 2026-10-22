import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  type CreateExpenseRequest,
  expenseIfMatch,
  parseTripPayload,
  type TripPayload,
} from "@narumitw/otter-contracts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createMcpServer } from "./server-mcp-tools.js";

function tripPayload(visaSettlementEnabled = false): TripPayload {
  const currency = visaSettlementEnabled ? "USD" : "EUR";
  return {
    trip: {
      id: "trip_1",
      ownerId: "owner_1",
      name: "Travel",
      baseCurrency: "EUR",
      visaSettlementEnabled,
      ...(visaSettlementEnabled ? { visaSettlementCurrency: "USD" } : {}),
      createdAt: "2026-09-20T00:00:00.000Z",
      participants: [
        { id: "alice", name: "Alice" },
        { id: "bob", name: "Bob" },
      ],
      expenses: [
        {
          id: "expense_1",
          description: "Dinner",
          amountMinor: 2400,
          currency: "EUR",
          expenseDate: "2026-09-20",
          createdAt: "2026-09-20T00:00:00.000Z",
          paidById: "alice",
          participantIds: ["alice", "bob"],
          ...(visaSettlementEnabled
            ? {
                visaExchangeRate: {
                  sourceCurrency: "EUR" as const,
                  targetCurrency: "USD" as const,
                  date: "2026-09-20",
                  rate: 1,
                  fetchedAt: "2026-09-20T00:00:00.000Z",
                },
              }
            : {}),
        },
      ],
    },
    balances: [
      { participantId: "alice", name: "Alice", amountMinor: 1200, currency },
      { participantId: "bob", name: "Bob", amountMinor: -1200, currency },
    ],
    settlements: [
      {
        fromId: "bob",
        fromName: "Bob",
        toId: "alice",
        toName: "Alice",
        amountMinor: 1200,
        currency,
      },
    ],
  };
}

const expenseFields = {
  description: "Dinner",
  amount: "24.00",
  currency: "EUR",
  paidById: "alice",
  participantIds: ["alice", "bob"],
  expenseDate: "2026-09-20",
  category: "餐飲",
  tags: ["travel"],
} satisfies CreateExpenseRequest;
const paymentFields = {
  fromId: "bob",
  toId: "alice",
  amount: "12.00",
  currency: "EUR",
  paidAt: "2026-09-20",
  note: "Paid in cash",
};

type ToolCase = {
  name: string;
  kind: "read" | "create" | "update";
  args: Record<string, unknown>;
  required: string[];
  method: string;
  path: string;
  body?: Record<string, unknown>;
  expenseVersion?: number;
};

const toolCases: ToolCase[] = [
  {
    name: "otter_list_trips",
    kind: "read",
    args: {},
    required: [],
    method: "GET",
    path: "/api/trips",
  },
  {
    name: "otter_get_trip",
    kind: "read",
    args: { tripId: "trip_1" },
    required: ["tripId"],
    method: "GET",
    path: "/api/trips/trip_1",
  },
  {
    name: "otter_get_balances",
    kind: "read",
    args: { tripId: "trip_1" },
    required: ["tripId"],
    method: "GET",
    path: "/api/trips/trip_1",
  },
  {
    name: "otter_get_settlements",
    kind: "read",
    args: { tripId: "trip_1" },
    required: ["tripId"],
    method: "GET",
    path: "/api/trips/trip_1",
  },
  {
    name: "otter_create_trip",
    kind: "create",
    args: { name: "Travel", baseCurrency: "EUR" },
    required: ["name"],
    method: "POST",
    path: "/api/trips",
    body: { name: "Travel", baseCurrency: "EUR" },
  },
  {
    name: "otter_update_trip",
    kind: "update",
    args: { tripId: "trip_1", name: "Travel", archived: true },
    required: ["tripId"],
    method: "PATCH",
    path: "/api/trips/trip_1",
    body: { name: "Travel", archived: true },
  },
  {
    name: "otter_delete_trip",
    kind: "update",
    args: { tripId: "trip_1", confirm: true },
    required: ["tripId", "confirm"],
    method: "DELETE",
    path: "/api/trips/trip_1",
  },
  {
    name: "otter_add_participant",
    kind: "create",
    args: { tripId: "trip_1", name: "Alice" },
    required: ["tripId", "name"],
    method: "POST",
    path: "/api/trips/trip_1/participants",
    body: { name: "Alice" },
  },
  {
    name: "otter_rename_participant",
    kind: "update",
    args: { tripId: "trip_1", participantId: "alice", name: "Alice A" },
    required: ["tripId", "participantId", "name"],
    method: "PATCH",
    path: "/api/trips/trip_1/participants/alice",
    body: { name: "Alice A" },
  },
  {
    name: "otter_delete_participant",
    kind: "update",
    args: { tripId: "trip_1", participantId: "bob", confirm: true },
    required: ["tripId", "participantId", "confirm"],
    method: "DELETE",
    path: "/api/trips/trip_1/participants/bob",
  },
  {
    name: "otter_add_expense",
    kind: "create",
    args: { tripId: "trip_1", ...expenseFields },
    required: [
      "tripId",
      "description",
      "amount",
      "currency",
      "paidById",
      "participantIds",
    ],
    method: "POST",
    path: "/api/trips/trip_1/expenses",
    body: expenseFields,
  },
  {
    name: "otter_update_expense",
    kind: "update",
    args: {
      tripId: "trip_1",
      expenseId: "expense_1",
      version: 7,
      ...expenseFields,
    },
    required: ["tripId", "expenseId", "version"],
    method: "PATCH",
    path: "/api/trips/trip_1/expenses/expense_1",
    body: { ...expenseFields, splitMode: "equal" },
    expenseVersion: 7,
  },
  {
    name: "otter_delete_expense",
    kind: "update",
    args: {
      tripId: "trip_1",
      expenseId: "expense_1",
      version: 7,
      confirm: true,
    },
    required: ["tripId", "expenseId", "version", "confirm"],
    method: "DELETE",
    path: "/api/trips/trip_1/expenses/expense_1",
    expenseVersion: 7,
  },
  {
    name: "otter_record_settlement",
    kind: "create",
    args: { tripId: "trip_1", ...paymentFields },
    required: ["tripId", "fromId", "toId", "amount"],
    method: "POST",
    path: "/api/trips/trip_1/settlement-payments",
    body: paymentFields,
  },
  {
    name: "otter_delete_settlement",
    kind: "update",
    args: { tripId: "trip_1", paymentId: "payment_1", confirm: true },
    required: ["tripId", "paymentId", "confirm"],
    method: "DELETE",
    path: "/api/trips/trip_1/settlement-payments/payment_1",
  },
];

const callApi = vi.fn<Parameters<typeof createMcpServer>[0]>();
let client: Client;
let server: ReturnType<typeof createMcpServer>;

async function callTool(name: string, args: Record<string, unknown>) {
  return CallToolResultSchema.parse(
    await client.callTool({ name, arguments: args }),
  );
}

beforeEach(async () => {
  callApi.mockReset();
  callApi.mockImplementation(() => Response.json(tripPayload()));
  server = createMcpServer(callApi);
  client = new Client({ name: "otter-tools-test", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await server.close();
});

test("discovers exactly 15 tools with strict schemas and safety annotations", async () => {
  const { tools } = await client.listTools();
  expect(tools.map(({ name }) => name).sort()).toEqual(
    toolCases.map(({ name }) => name).sort(),
  );
  expect(tools).toHaveLength(15);
  for (const toolCase of toolCases) {
    const tool = tools.find(({ name }) => name === toolCase.name);
    if (!tool) throw new Error(`Missing tool: ${toolCase.name}`);
    expect(tool.description).toBeTruthy();
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(Object.keys(tool.inputSchema.properties ?? {}).sort()).toEqual(
      Object.keys(toolCase.args).sort(),
    );
    expect([...(tool.inputSchema.required ?? [])].sort()).toEqual(
      [...toolCase.required].sort(),
    );
    expect(tool.annotations).toEqual({
      readOnlyHint: toolCase.kind === "read",
      destructiveHint: toolCase.kind === "update",
      idempotentHint: toolCase.kind !== "create",
      openWorldHint: false,
    });
  }
  expect(callApi).not.toHaveBeenCalled();
});

describe.each(toolCases)("$name", (toolCase) => {
  test("maps arguments to the REST path, body, and headers", async () => {
    const result = await callTool(toolCase.name, toolCase.args);
    const headers: Record<string, string> = {};
    if (toolCase.body) headers["Content-Type"] = "application/json";
    if (toolCase.expenseVersion !== undefined) {
      headers["If-Match"] = expenseIfMatch(toolCase.expenseVersion);
    }
    expect(callApi).toHaveBeenCalledExactlyOnceWith(toolCase.path, {
      method: toolCase.method,
      headers,
      ...(toolCase.body ? { body: JSON.stringify(toolCase.body) } : {}),
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent?.status).toBe(200);
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify(result.structuredContent) },
    ]);
  });

  test.each(["unexpected", "allowApiWrites"])(
    "rejects the unknown property %s before calling the API",
    async (property) => {
      const result = await callTool(toolCase.name, {
        ...toolCase.args,
        [property]: true,
      });
      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: "text",
          text: expect.stringContaining("Input validation error"),
        },
      ]);
      expect(callApi).not.toHaveBeenCalled();
    },
  );
});

describe.each(toolCases.filter(({ method }) => method === "DELETE"))(
  "$name deletion confirmation",
  (toolCase) => {
    test.each([undefined, false, "true", 1])(
      "rejects confirmation %s",
      async (confirm) => {
        const args = { ...toolCase.args };
        delete args.confirm;
        if (confirm !== undefined) args.confirm = confirm;
        const result = await callTool(toolCase.name, args);
        expect(result.isError).toBe(true);
        expect(callApi).not.toHaveBeenCalled();
      },
    );
  },
);

describe.each(["otter_update_expense", "otter_delete_expense"])(
  "%s expense version",
  (name) => {
    test.each([undefined, 0, -1, 1.5, "7", Number.MAX_SAFE_INTEGER + 1])(
      "rejects version %s",
      async (version) => {
        const args: Record<string, unknown> = {
          tripId: "trip_1",
          expenseId: "expense_1",
          ...(name === "otter_delete_expense" ? { confirm: true } : {}),
        };
        if (version !== undefined) args.version = version;
        const result = await callTool(name, args);
        expect(result.isError).toBe(true);
        expect(callApi).not.toHaveBeenCalled();
      },
    );
  },
);

test.each([
  { name: "otter_get_trip", args: { tripId: "../other" } },
  {
    name: "otter_update_expense",
    args: { tripId: "trip_1", expenseId: "../other", version: 7 },
  },
  {
    name: "otter_rename_participant",
    args: { tripId: "trip_1", participantId: "../other", name: "Alice" },
  },
  {
    name: "otter_delete_settlement",
    args: { tripId: "trip_1", paymentId: "../other", confirm: true },
  },
])("rejects path traversal in $name IDs", async ({ name, args }) => {
  const result = await callTool(name, args);
  expect(result.isError).toBe(true);
  expect(callApi).not.toHaveBeenCalled();
});

test.each([
  "..",
  "%2e%2e%2fother",
  "trip/other",
  "trip\\other",
  "trip?x=1",
  "trip#x",
])("rejects unsafe trip ID %s", async (tripId) => {
  const result = await callTool("otter_get_trip", { tripId });
  expect(result.isError).toBe(true);
  expect(callApi).not.toHaveBeenCalled();
});

test("does not change the split when participantIds are absent", async () => {
  await callTool("otter_update_expense", {
    tripId: "trip_1",
    expenseId: "expense_1",
    version: 9,
    description: "Lunch",
  });
  expect(callApi).toHaveBeenCalledExactlyOnceWith(
    "/api/trips/trip_1/expenses/expense_1",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "If-Match": expenseIfMatch(9),
      },
      body: JSON.stringify({ description: "Lunch" }),
    },
  );
});

test.each([400, 401, 403, 404, 409, 429, 500])(
  "returns a structured HTTP %s error without retrying",
  async (status) => {
    const data = { error: "Write rejected", code: "EXPENSE_VERSION_CONFLICT" };
    callApi.mockImplementation(() => Response.json(data, { status }));
    const result = await callTool("otter_update_expense", {
      tripId: "trip_1",
      expenseId: "expense_1",
      version: 7,
      description: "Lunch",
    });
    expect(result).toEqual({
      isError: true,
      structuredContent: { status, data },
      content: [{ type: "text", text: JSON.stringify({ status, data }) }],
    });
    expect(callApi).toHaveBeenCalledTimes(1);
  },
);

test.each(["otter_get_balances", "otter_get_settlements"])(
  "%s preserves HTTP errors instead of parsing them as a trip",
  async (name) => {
    const data = { error: "Group not found" };
    callApi.mockImplementation(() => Response.json(data, { status: 404 }));
    const result = await callTool(name, { tripId: "trip_1" });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({ status: 404, data });
  },
);

test.each(["throw", "reject", "invalid JSON", "invalid trip"])(
  "sanitizes errors from %s",
  async (failure) => {
    const secret = "postgres://private-host/password-token";
    if (failure === "throw") {
      callApi.mockImplementation(() => {
        throw new Error(secret);
      });
    } else if (failure === "reject") {
      callApi.mockRejectedValue(new Error(secret));
    } else if (failure === "invalid JSON") {
      callApi.mockImplementation(() => new Response(secret));
    } else {
      callApi.mockImplementation(() => Response.json({ secret }));
    }
    const result = await callTool("otter_get_balances", { tripId: "trip_1" });
    const structuredContent = {
      status: 500,
      data: { error: "Internal server error" },
    };
    expect(result).toEqual({
      isError: true,
      structuredContent,
      content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(callApi).toHaveBeenCalledTimes(1);
  },
);

describe.each([false, true])("Visa settlement enabled: %s", (visaEnabled) => {
  test.each(["balances", "settlements"] as const)(
    "returns only %s with settlement currency and minor units",
    async (select) => {
      const payload = tripPayload(visaEnabled);
      expect(parseTripPayload(payload)).toEqual(payload);
      callApi.mockImplementation(() => Response.json(payload));
      const result = await callTool(`otter_get_${select}`, {
        tripId: "trip_1",
      });
      const structuredContent = {
        status: 200,
        data: {
          tripId: "trip_1",
          currency: visaEnabled ? "USD" : "EUR",
          unit: "minor",
          [select]: payload[select],
        },
      };
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual(structuredContent);
      expect(result.content).toEqual([
        { type: "text", text: JSON.stringify(structuredContent) },
      ]);
      expect(callApi).toHaveBeenCalledExactlyOnceWith("/api/trips/trip_1", {
        method: "GET",
        headers: {},
      });
    },
  );
});
