import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAdaptorServer } from "@hono/node-server";
import { tripExpensesCsv } from "@narumitw/otter-core/csv";
import {
  participantSharesFromExisting,
  previewParticipantShares,
  type SplitMode,
} from "@narumitw/otter-core/expense-splits";
import {
  convertExpenseMinor,
  convertMinorWithRates,
  currencies,
  fixedExchangeRates,
  isCurrency,
  parseAmountToMinor,
} from "@narumitw/otter-core/money";
import {
  calculateBalances,
  calculateMemberAccounts,
  calculateSettlements,
  type Trip,
} from "@narumitw/otter-core/settlement";
import { convertVisaExpenseMinor } from "@narumitw/otter-core/visa-settlement";
import type { Rate } from "@narumitw/otter-exchange-rates";
import pg from "pg";
import { runMigrations } from "../apps/api/scripts/migrate.js";
import { createApp } from "../apps/api/src/server.js";
import {
  redact,
  runTool,
  runUI,
  toolEnvironment,
} from "./ios-integration-ui.js";

// Only external quote services are replaced. HTTP, authentication, SQL, migrations,
// and the Swift URLSession clients run without test transports or database fixtures.
const timestamp = "2026-09-20T00:00:00.000Z";
type DifferentialCase = {
  name: string;
  kind: string;
  input: unknown;
  expected: unknown;
  throwsError: boolean;
};

function fixtures() {
  const cases: DifferentialCase[] = [];
  function add(
    name: string,
    kind: string,
    input: unknown,
    result: () => unknown,
  ) {
    try {
      cases.push({
        name,
        kind,
        input,
        expected: result() ?? null,
        throwsError: false,
      });
    } catch {
      cases.push({ name, kind, input, expected: null, throwsError: true });
    }
  }
  const base: Trip = {
    id: "fixture",
    ownerId: "owner",
    name: "Differential",
    baseCurrency: "TWD",
    createdAt: timestamp,
    participants: [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Carol" },
    ],
    expenses: [
      {
        id: "e1",
        description: "Dinner",
        amountMinor: 1001,
        currency: "TWD",
        paidById: "a",
        participantIds: ["c", "b", "a"],
        expenseDate: "2026-09-19",
        createdAt: timestamp,
        category: "餐飲",
        tags: ["food"],
      },
      {
        id: "e2",
        description: "Train",
        amountMinor: 123,
        currency: "JPY",
        paidById: "b",
        participantIds: ["b", "c"],
        expenseDate: "2026-09-20",
        createdAt: timestamp,
        category: "交通",
        tags: ["rail"],
      },
      {
        id: "e3",
        description: "DINNER extra",
        amountMinor: 101,
        currency: "USD",
        paidById: "c",
        participantIds: ["a", "c"],
        participantShares: [
          { participantId: "a", shareMinor: 1 },
          { participantId: "c", shareMinor: 100 },
        ],
        expenseDate: "2026-09-20",
        createdAt: timestamp,
      },
    ],
    settlementPayments: [],
  };
  const trips: [string, Trip][] = [
    ["empty", { ...base, expenses: [] }],
    ["mixed-currencies-remainders", base],
    [
      "custom-rates",
      { ...base, exchangeRates: { TWD: 1, JPY: 0.25, USD: 33 } },
    ],
    [
      "frozen-and-rebased",
      {
        ...base,
        baseCurrency: "EUR",
        expenses: base.expenses.map((expense) => ({
          ...expense,
          exchangeRate: {
            source: "custom",
            baseCurrency: "TWD",
            rateToBase:
              expense.currency === "TWD"
                ? 1
                : expense.currency === "JPY"
                  ? 0.24
                  : 31,
          },
        })),
      },
    ],
    [
      "payment-representative",
      {
        ...base,
        participants: base.participants.map((p) =>
          p.id === "c" ? { ...p, settledById: "b" } : p,
        ),
        settlementPayments: [
          {
            id: "p1",
            fromId: "b",
            toId: "a",
            amountMinor: 100,
            currency: "TWD",
            paidAt: "2026-09-20",
            note: "Cash",
            createdAt: timestamp,
          },
        ],
      },
    ],
    [
      "visa",
      {
        ...base,
        visaSettlementEnabled: true,
        visaSettlementCurrency: "JPY",
        expenses: base.expenses.map((expense) => ({
          ...expense,
          visaExchangeRate: {
            sourceCurrency: expense.currency,
            targetCurrency: "JPY",
            rate:
              expense.currency === "JPY"
                ? 1
                : expense.currency === "USD"
                  ? 150
                  : 4.5,
            date: expense.expenseDate,
            fetchedAt: timestamp,
          },
        })),
      },
    ],
  ];
  for (const [name, trip] of trips) {
    add(`${name}/balances`, "balances", trip, () => calculateBalances(trip));
    add(`${name}/settlements`, "settlements", trip, () =>
      calculateSettlements(trip),
    );
    add(`${name}/accounts`, "accounts", trip, () =>
      calculateMemberAccounts(trip).map((account) => ({
        ...account,
        balanceCurrency: account.currency,
        paymentDetailsAvailable: true,
      })),
    );
  }
  for (const mode of [
    "equal",
    "amount",
    "ratio",
    "shares",
  ] satisfies SplitMode[]) {
    const values =
      mode === "amount"
        ? { a: "100", b: "200", c: "701" }
        : { a: "1", b: "2", c: "7" };
    const input = {
      mode,
      participantIDs: ["a", "b", "c"],
      amountMinor: 1001,
      values,
      currency: "TWD",
    };
    add(`split/${mode}`, "split", input, () =>
      previewParticipantShares(
        mode,
        input.participantIDs,
        input.amountMinor,
        values,
        "TWD",
      ),
    );
  }
  for (const [name, mode, amountMinor, values] of [
    ["zero-share", "equal", 1, {}],
    ["amount-mismatch", "amount", 100, { a: "1", b: "1" }],
    ["negative-weight", "ratio", 100, { a: "-1", b: "2" }],
    ["nondecimal-weight", "shares", 100, { a: "1e2", b: "2" }],
  ] satisfies [string, SplitMode, number, Record<string, string>][]) {
    const input = {
      mode,
      participantIDs: ["a", "b"],
      amountMinor,
      values,
      currency: "TWD",
    };
    add(`split-invalid/${name}`, "split", input, () =>
      previewParticipantShares(
        mode,
        input.participantIDs,
        amountMinor,
        values,
        "TWD",
      ),
    );
  }
  for (const next of [1001, 2500]) {
    const previousShares = [
      { participantId: "a", shareMinor: 250 },
      { participantId: "b", shareMinor: 750 },
    ];
    add(
      `preserve/${next}`,
      "existing",
      {
        participantIDs: ["b", "a"],
        amountMinor: next,
        previousAmountMinor: 1000,
        previousShares,
      },
      () =>
        participantSharesFromExisting(["b", "a"], next, 1000, previousShares),
    );
  }
  for (const currency of currencies) {
    const input = { amountMinor: 12345, from: currency, to: "TWD" };
    add(`convert/${currency}`, "convert", input, () =>
      convertMinorWithRates(input.amountMinor, currency, "TWD"),
    );
    const amount =
      currency === "TWD" || currency === "JPY" || currency === "KRW"
        ? "123"
        : "123.45";
    add(`parse/${currency}`, "parse", { amount, currency }, () =>
      parseAmountToMinor(amount, currency),
    );
  }
  for (const amountMinor of [-101, -1, 1, 101, 90071992547409]) {
    add(
      `round/${amountMinor}`,
      "convert",
      { amountMinor, from: "TWD", to: "USD", rates: { TWD: 1, USD: 2 } },
      () =>
        convertMinorWithRates(amountMinor, "TWD", "USD", { TWD: 1, USD: 2 }),
    );
  }
  for (const amountMinor of [-101, -1, 1, 101]) {
    add(
      `half-round/${amountMinor}`,
      "convert",
      { amountMinor, from: "TWD", to: "USD", rates: { TWD: 1, USD: 200 } },
      () =>
        convertMinorWithRates(amountMinor, "TWD", "USD", { TWD: 1, USD: 200 }),
    );
  }
  for (const amount of ["0", "-1", "1e2", "1.234", "9007199254740992"]) {
    add(`parse-invalid/${amount}`, "parse", { amount, currency: "TWD" }, () =>
      parseAmountToMinor(amount, "TWD"),
    );
  }
  const businessWhitespace = [
    0x0009,
    0x000a,
    0x000b,
    0x000c,
    0x000d,
    0x0020,
    0x00a0,
    0x1680,
    ...Array.from({ length: 11 }, (_, index) => 0x2000 + index),
    0x2028,
    0x2029,
    0x202f,
    0x205f,
    0x3000,
    0xfeff,
  ];
  for (const codePoint of [...businessWhitespace, 0x0085, 0x180e, 0x200b, 0]) {
    const edge = String.fromCodePoint(codePoint);
    for (const currency of currencies) {
      const amount = `${edge}12${edge}`;
      add(
        `parse-trim/${currency}/U+${codePoint.toString(16).padStart(4, "0")}`,
        "parse",
        { amount, currency },
        () => parseAmountToMinor(amount, currency),
      );
    }
  }
  const snapshot = {
    source: "bank" as const,
    baseCurrency: "TWD" as const,
    rateToBase: 0.22,
    provider: "BANK_OF_TAIWAN" as const,
    rateType: "spotMid" as const,
    fetchedAt: timestamp,
  };
  add(
    "snapshot/rebase",
    "expense-convert",
    { amountMinor: 123, currency: "JPY", baseCurrency: "USD", snapshot },
    () => convertExpenseMinor(123, "JPY", "USD", snapshot),
  );
  const visa = {
    sourceCurrency: "USD" as const,
    targetCurrency: "JPY" as const,
    date: "2026-09-20",
    rate: 150.5,
    fetchedAt: timestamp,
  };
  add(
    "visa/round",
    "visa-convert",
    {
      amountMinor: 101,
      currency: "USD",
      date: visa.date,
      rate: visa,
      targetCurrency: "JPY",
    },
    () => convertVisaExpenseMinor(101, "USD", visa.date, visa, "JPY"),
  );
  add(
    "visa/stale-date",
    "visa-convert",
    {
      amountMinor: 101,
      currency: "USD",
      date: "2026-09-21",
      rate: visa,
      targetCurrency: "JPY",
    },
    () => convertVisaExpenseMinor(101, "USD", "2026-09-21", visa, "JPY"),
  );

  // Query functions are web-only. These expected IDs are hand-authored, not imported
  // from an application. Money and finance expectations above come from core.
  const defaults = {
    query: "",
    dateFrom: "",
    dateTo: "",
    paidById: "",
    participantId: "",
    currency: "",
    category: "",
    tag: "",
    sort: "date-desc",
  };
  for (const [name, filter, expected] of [
    ["date-desc", {}, ["e3", "e2", "e1"]],
    ["date-asc", { sort: "date-asc" }, ["e1", "e2", "e3"]],
    ["amount-desc", { sort: "amount-desc" }, ["e1", "e3", "e2"]],
    ["amount-asc", { sort: "amount-asc" }, ["e2", "e3", "e1"]],
    ["description", { query: "  dinner  " }, ["e3", "e1"]],
    [
      "date-range",
      { dateFrom: "2026-09-20", dateTo: "2026-09-20" },
      ["e3", "e2"],
    ],
    ["payer", { paidById: "b" }, ["e2"]],
    ["participant", { participantId: "a" }, ["e3", "e1"]],
    ["currency", { currency: "JPY" }, ["e2"]],
    ["category", { category: "交通" }, ["e2"]],
    ["tag", { tag: "food" }, ["e1"]],
    ["empty", { query: "missing" }, []],
  ] satisfies [string, Record<string, string>, string[]][]) {
    add(
      `query/${name}`,
      "query",
      { trip: base, filters: { ...defaults, ...filter } },
      () => expected,
    );
  }
  const unicodeTrip: Trip = {
    ...base,
    expenses: [
      { ...base.expenses[0], description: "Caf\u00e9", tags: ["\u00e9"] },
      { ...base.expenses[1], description: "Cafe\u0301", tags: ["e\u0301"] },
    ],
  };
  for (const [name, filter, expected] of [
    ["nfc-query", { query: "CAF\u00c9" }, ["e1"]],
    ["nfd-query", { query: "CAFE\u0301" }, ["e2"]],
    ["partial-code-units", { query: "Cafe" }, ["e2"]],
    ["nfc-tag", { tag: "\u00e9" }, ["e1"]],
    ["nfd-tag", { tag: "e\u0301" }, ["e2"]],
    ["bom-query", { query: "\ufeffCaf\u00e9\ufeff" }, ["e1"]],
    ["nel-query", { query: "\u0085Caf\u00e9\u0085" }, []],
    ["zero-width-query", { query: "\u200bCaf\u00e9\u200b" }, []],
  ] satisfies [string, Record<string, string>, string[]][]) {
    add(
      `query-utf16/${name}`,
      "query",
      { trip: unicodeTrip, filters: { ...defaults, ...filter } },
      () => expected,
    );
  }
  for (const [grouping, expected] of [
    [
      "date",
      [
        {
          key: "2026-09-20",
          ids: ["e3", "e2"],
          totals: [
            { currency: "USD", amountMinor: 101 },
            { currency: "JPY", amountMinor: 123 },
          ],
        },
        {
          key: "2026-09-19",
          ids: ["e1"],
          totals: [{ currency: "TWD", amountMinor: 1001 }],
        },
      ],
    ],
    [
      "payer",
      [
        {
          key: "a",
          ids: ["e1"],
          totals: [{ currency: "TWD", amountMinor: 1001 }],
        },
        {
          key: "b",
          ids: ["e2"],
          totals: [{ currency: "JPY", amountMinor: 123 }],
        },
        {
          key: "c",
          ids: ["e3"],
          totals: [{ currency: "USD", amountMinor: 101 }],
        },
      ],
    ],
    [
      "none",
      [
        {
          key: "all",
          ids: ["e3", "e2", "e1"],
          totals: [
            { currency: "USD", amountMinor: 101 },
            { currency: "JPY", amountMinor: 123 },
            { currency: "TWD", amountMinor: 1001 },
          ],
        },
      ],
    ],
  ] as const) {
    add(
      `groups/${grouping}`,
      "groups",
      { trip: base, filters: defaults, grouping },
      () => expected,
    );
  }
  const amounts = base.expenses.map((e) =>
    convertExpenseMinor(e.amountMinor, e.currency, base.baseCurrency),
  );
  const [dinner, train, extra] = amounts;
  add("summary/all-totals", "summary", base, () => ({
    totalMinor: amounts.reduce((sum, amount) => sum + amount, 0),
    dailyTotals: [
      { date: "2026-09-19", amountMinor: dinner },
      { date: "2026-09-20", amountMinor: train + extra },
    ],
    payerTotals: [
      { participantId: "a", name: "Alice", amountMinor: dinner },
      { participantId: "c", name: "Carol", amountMinor: extra },
      { participantId: "b", name: "Bob", amountMinor: train },
    ],
    categoryTotals: [
      { category: "餐飲", amountMinor: dinner },
      { category: "其他", amountMinor: extra },
      { category: "交通", amountMinor: train },
    ],
  }));
  return { cases, csv: tripExpensesCsv(base) };
}

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(
    args.every((arg) =>
      [
        "--ui",
        "--ui-ipad",
        "--web",
        "--ui-diagnostic-group",
        "--ui-diagnostic-expense",
      ].includes(arg),
    ) && args.length <= 1,
    "Usage: tsx scripts/test-ios-integration.ts [--ui | --ui-ipad | --web | --ui-diagnostic-group | --ui-diagnostic-expense]",
  );
  assert.equal(
    process.platform,
    "darwin",
    "iOS integration requires macOS and Xcode; it cannot be skipped.",
  );
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(
    databaseUrl,
    "Set DATABASE_URL explicitly. The harness creates and drops only its own schema.",
  );
  const schema = `otter_ios_${process.pid}_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema}`,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  let owned = false;
  let server: Server | undefined;
  let directory: string | undefined;
  const abort = new AbortController();
  const stop = () => abort.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    owned = true;
    const location = await pool.query<{ schema: string }>(
      "SELECT current_schema() AS schema",
    );
    assert.equal(
      location.rows[0]?.schema,
      schema,
      "Refuse migrations outside the owned schema.",
    );
    const logger = { log: (..._messages: unknown[]) => {} };
    const migrated = await runMigrations(pool, { logger });
    assert.ok(migrated > 0, "Disposable schema must apply migrations.");
    assert.equal(await runMigrations(pool, { logger }), 0);
    const rates: Rate[] = [
      ["JPY", 0.22],
      ["USD", 32],
      ["EUR", 35],
    ].map(([source, mid]) => {
      assert.equal(typeof source, "string");
      assert.equal(typeof mid, "number");
      return {
        exchange: "BANK_OF_TAIWAN",
        fetchedAt: timestamp,
        source: String(source),
        spotBuy: Number(mid),
        spotSell: Number(mid),
        target: "TWD",
      };
    });
    const app = createApp(pool, {
      exchangeRates: { fetchRates: async () => rates },
      visaSettlement: {
        fetchRate: async (query) => {
          assert.ok(isCurrency(query.source) && isCurrency(query.target));
          const from = query.source;
          const to = query.target;
          const rate =
            fixedExchangeRates("TWD")[from] / fixedExchangeRates("TWD")[to];
          const amount = query.amount ?? 1;
          return {
            source: from,
            target: to,
            date: query.date ?? "2026-09-20",
            amount,
            bankFeePercent: 0,
            visaRate: rate,
            rate,
            convertedAmount: amount * rate,
            fetchedAt: timestamp,
          };
        },
      },
    });
    const adapter = createAdaptorServer({ fetch: app.fetch });
    assert.ok(
      adapter instanceof Server,
      "Integration requires the HTTP/1 adapter.",
    );
    server = adapter;
    await listen(server);
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const fixture = fixtures();
    directory = await mkdtemp(path.join(tmpdir(), "otter-ios-integration-"));
    const fixturePath = path.join(directory, "differential.json");
    await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
    console.log(
      `Applied ${migrated} migrations in an owned disposable schema; running ${fixture.cases.length} differential cases and live Swift workflows.`,
    );
    const origin = `http://localhost:${address.port}`;
    await runTool(
      "swift",
      [
        "run",
        "--package-path",
        "apps/ios",
        "--scratch-path",
        path.join(directory, "SwiftBuild"),
        "OtterIntegration",
        origin,
        fixturePath,
      ],
      abort.signal,
      240_000,
      toolEnvironment(),
      true,
    );
    const diagnostic = args.includes("--ui-diagnostic-group")
      ? "group"
      : args.includes("--ui-diagnostic-expense")
        ? "expense"
        : undefined;
    if (args.includes("--ui") || args.includes("--ui-ipad") || diagnostic) {
      await runUI(
        origin,
        directory,
        abort.signal,
        args.includes("--ui-ipad") ? "iPad" : "iPhone",
        diagnostic,
      );
    }
    if (args.includes("--web")) {
      const { runCrossClientBrowser } = await import(
        "./ios-integration-browser.js"
      );
      await runCrossClientBrowser(origin, directory, abort.signal);
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    try {
      if (server?.listening) {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server?.close((error) => (error ? reject(error) : resolve())),
        );
      }
    } finally {
      try {
        await pool.end();
      } finally {
        try {
          if (owned) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        } finally {
          try {
            await admin.end();
          } finally {
            if (directory)
              await rm(directory, { recursive: true, force: true });
          }
        }
      }
    }
    console.log(
      "Closed HTTP server and pools; removed only the owned schema and temporary fixtures.",
    );
  }
}

main().catch((error: unknown) => {
  // Do not print connection URLs, test credentials, cookies, tokens, or response bodies.
  const message =
    error instanceof Error ? error.message : "Unknown integration failure";
  console.error(redact(message));
  process.exitCode = 1;
});
