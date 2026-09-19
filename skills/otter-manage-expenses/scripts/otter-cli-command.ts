import {
  type CliCommand,
  CliError,
  type DeviceLoginOptions,
} from "./otter-cli-types.js";

type ParsedOptions = Map<string, string | true>;
const helpText = `Usage: otter <resource> <action> [options]

Resources and actions:
  auth login      [--client-name <name>] [--no-open]
  auth status
  auth logout
  me
  trips list
  trips get       --trip <id>
  trips create    --name <name> [--currency TWD|JPY|USD|EUR]
  trips update    --trip <id> [--name <name>] [--currency <code>] [--archived true|false]
  trips delete    --trip <id> --yes
  participants list   --trip <id>
  participants add    --trip <id> --name <name>
  participants rename --trip <id> --participant <id> --name <name>
  participants delete --trip <id> --participant <id> --yes
  expenses list   --trip <id>
  expenses add    --trip <id> --description <text> --amount <major-unit amount>
                  --currency <code> --paid-by <participant id>
                  --split-with <comma-separated participant ids>
                  [--date YYYY-MM-DD] [--category <name>] [--tags <comma-separated>]
  expenses update --trip <id> --expense <id> [expense fields]
  expenses delete --trip <id> --expense <id> --yes
  balances get    --trip <id>
  settlements list   --trip <id>
  settlements record --trip <id> --from <participant id> --to <participant id>
                     --amount <major-unit amount> [--currency <code>]
                     [--date YYYY-MM-DD] [--note <text>]
  settlements delete --trip <id> --payment <id> --yes

Environment:
  OTTER_URL         Server URL (default: http://localhost:17463)
  OTTER_TOKEN       Optional non-persisted Bearer token for agents or CI
  OTTER_CONFIG_PATH Optional credential file path
  OTTER_ALLOW_INSECURE_HTTP=1 permits credentials over non-local HTTP

Run 'otter auth login' to approve this CLI in an authenticated browser.

Data commands print JSON to stdout. Errors print JSON to stderr and exit non-zero.`;

export function cliHelp(): string {
  return helpText;
}

export function parseCliCommand(args: string[]): CliCommand {
  const [resource, action, ...optionArgs] = args;
  if (!resource || resource === "help" || resource === "--help") {
    throw new CliError("HELP", helpText);
  }
  if (resource === "me") {
    if (action || optionArgs.length > 0) {
      throw new CliError("USAGE", "me does not accept arguments");
    }
    return { method: "GET", path: "/api/me" };
  }
  if (resource === "auth" && action === "status") {
    if (optionArgs.length > 0) {
      throw new CliError("USAGE", "auth status does not accept options");
    }
    return { method: "GET", path: "/api/me" };
  }
  if (!action) {
    throw new CliError("USAGE", `Missing action for ${resource}`);
  }

  const options = parseOptions(optionArgs);
  switch (`${resource}:${action}`) {
    case "trips:list":
      assertAllowed(options, []);
      return { method: "GET", path: "/api/trips" };
    case "trips:get": {
      assertAllowed(options, ["trip"]);
      const tripId = required(options, "trip");
      return tripRequest(tripId);
    }
    case "trips:create": {
      assertAllowed(options, ["name", "currency"]);
      return {
        body: compact({
          baseCurrency: optional(options, "currency"),
          name: required(options, "name"),
        }),
        method: "POST",
        path: "/api/trips",
      };
    }
    case "trips:update": {
      assertAllowed(options, ["trip", "name", "currency", "archived"]);
      const tripId = required(options, "trip");
      const body = compact({
        archived: optionalBoolean(options, "archived"),
        baseCurrency: optional(options, "currency"),
        name: optional(options, "name"),
      });
      requireChanges(body);
      return {
        body,
        method: "PATCH",
        path: `/api/trips/${encodeURIComponent(tripId)}`,
      };
    }
    case "trips:delete": {
      assertAllowed(options, ["trip", "yes"]);
      requireConfirmation(options);
      const tripId = required(options, "trip");
      return {
        method: "DELETE",
        path: `/api/trips/${encodeURIComponent(tripId)}`,
      };
    }
    case "participants:list": {
      assertAllowed(options, ["trip"]);
      return tripRequest(required(options, "trip"), "participants");
    }
    case "participants:add": {
      assertAllowed(options, ["trip", "name"]);
      const tripId = required(options, "trip");
      return {
        body: { name: required(options, "name") },
        method: "POST",
        path: `/api/trips/${encodeURIComponent(tripId)}/participants`,
      };
    }
    case "participants:rename": {
      assertAllowed(options, ["trip", "participant", "name"]);
      const tripId = required(options, "trip");
      const participantId = required(options, "participant");
      return {
        body: { name: required(options, "name") },
        method: "PATCH",
        path: `/api/trips/${encodeURIComponent(tripId)}/participants/${encodeURIComponent(participantId)}`,
      };
    }
    case "participants:delete": {
      assertAllowed(options, ["trip", "participant", "yes"]);
      requireConfirmation(options);
      const tripId = required(options, "trip");
      const participantId = required(options, "participant");
      return {
        method: "DELETE",
        path: `/api/trips/${encodeURIComponent(tripId)}/participants/${encodeURIComponent(participantId)}`,
      };
    }
    case "expenses:list": {
      assertAllowed(options, ["trip"]);
      return tripRequest(required(options, "trip"), "expenses");
    }
    case "expenses:add":
      return expenseAddCommand(options);
    case "expenses:update":
      return expenseUpdateCommand(options);
    case "expenses:delete": {
      assertAllowed(options, ["trip", "expense", "yes"]);
      requireConfirmation(options);
      const tripId = required(options, "trip");
      const expenseId = required(options, "expense");
      return {
        method: "DELETE",
        path: `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`,
      };
    }
    case "balances:get": {
      assertAllowed(options, ["trip"]);
      return tripRequest(required(options, "trip"), "balances");
    }
    case "settlements:list": {
      assertAllowed(options, ["trip"]);
      return tripRequest(required(options, "trip"), "settlements");
    }
    case "settlements:record":
      return settlementRecordCommand(options);
    case "settlements:delete": {
      assertAllowed(options, ["trip", "payment", "yes"]);
      requireConfirmation(options);
      const tripId = required(options, "trip");
      const paymentId = required(options, "payment");
      return {
        method: "DELETE",
        path: `/api/trips/${encodeURIComponent(tripId)}/settlement-payments/${encodeURIComponent(paymentId)}`,
      };
    }
    default:
      throw new CliError(
        "USAGE",
        `Unknown command: ${resource} ${action}. Run with --help for usage.`,
      );
  }
}

function expenseAddCommand(options: ParsedOptions): CliCommand {
  assertAllowed(options, [
    "trip",
    "description",
    "amount",
    "currency",
    "paid-by",
    "split-with",
    "date",
    "category",
    "tags",
  ]);
  const tripId = required(options, "trip");
  return {
    body: compact({
      amount: required(options, "amount"),
      category: optional(options, "category"),
      currency: required(options, "currency"),
      description: required(options, "description"),
      expenseDate: optional(options, "date"),
      paidById: required(options, "paid-by"),
      participantIds: requiredList(options, "split-with"),
      tags: optionalList(options, "tags"),
    }),
    method: "POST",
    path: `/api/trips/${encodeURIComponent(tripId)}/expenses`,
  };
}

function expenseUpdateCommand(options: ParsedOptions): CliCommand {
  assertAllowed(options, [
    "trip",
    "expense",
    "description",
    "amount",
    "currency",
    "paid-by",
    "split-with",
    "date",
    "category",
    "tags",
  ]);
  const tripId = required(options, "trip");
  const expenseId = required(options, "expense");
  const participantIds = optionalList(options, "split-with");
  const body = compact({
    amount: optional(options, "amount"),
    category: optional(options, "category"),
    currency: optional(options, "currency"),
    description: optional(options, "description"),
    expenseDate: optional(options, "date"),
    paidById: optional(options, "paid-by"),
    participantIds,
    splitMode: participantIds === undefined ? undefined : "equal",
    tags: optionalList(options, "tags"),
  });
  requireChanges(body);
  return {
    body,
    method: "PATCH",
    path: `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`,
  };
}

function settlementRecordCommand(options: ParsedOptions): CliCommand {
  assertAllowed(options, [
    "trip",
    "from",
    "to",
    "amount",
    "currency",
    "date",
    "note",
  ]);
  const tripId = required(options, "trip");
  return {
    body: compact({
      amount: required(options, "amount"),
      currency: optional(options, "currency"),
      fromId: required(options, "from"),
      note: optional(options, "note"),
      paidAt: optional(options, "date"),
      toId: required(options, "to"),
    }),
    method: "POST",
    path: `/api/trips/${encodeURIComponent(tripId)}/settlement-payments`,
  };
}

function tripRequest(
  tripId: string,
  select?: CliCommand["select"],
): CliCommand {
  return {
    method: "GET",
    path: `/api/trips/${encodeURIComponent(tripId)}`,
    select,
  };
}

function parseOptions(args: string[]): ParsedOptions {
  const options: ParsedOptions = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token?.startsWith("--") || token.length === 2) {
      throw new CliError("USAGE", `Unexpected argument: ${token ?? ""}`);
    }
    const name = token.slice(2);
    if (options.has(name)) {
      throw new CliError("USAGE", `Option --${name} may only be used once`);
    }
    if (name === "yes" || name === "no-open") {
      options.set(name, true);
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CliError("USAGE", `Option --${name} requires a value`);
    }
    options.set(name, value);
    index += 1;
  }
  return options;
}

function assertAllowed(options: ParsedOptions, allowed: string[]): void {
  for (const name of options.keys()) {
    if (!allowed.includes(name)) {
      throw new CliError("USAGE", `Unknown option: --${name}`);
    }
  }
}

function required(options: ParsedOptions, name: string): string {
  const value = options.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new CliError("USAGE", `Missing required option: --${name}`);
  }
  return value;
}

function optional(options: ParsedOptions, name: string): string | undefined {
  const value = options.get(name);
  return typeof value === "string" ? value : undefined;
}

function optionalBoolean(
  options: ParsedOptions,
  name: string,
): boolean | undefined {
  const value = optional(options, name);
  if (value === undefined) {
    return undefined;
  }
  if (value !== "true" && value !== "false") {
    throw new CliError("USAGE", `Option --${name} must be true or false`);
  }
  return value === "true";
}

function requiredList(options: ParsedOptions, name: string): string[] {
  const values = parseList(required(options, name));
  if (values.length === 0) {
    throw new CliError("USAGE", `Option --${name} requires at least one value`);
  }
  return values;
}

function optionalList(
  options: ParsedOptions,
  name: string,
): string[] | undefined {
  const value = optional(options, name);
  return value === undefined ? undefined : parseList(value);
}

function parseList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function requireConfirmation(options: ParsedOptions): void {
  if (options.get("yes") !== true) {
    throw new CliError("CONFIRMATION_REQUIRED", "Deletion requires --yes");
  }
}

function compact(
  value: Record<string, unknown | undefined>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, unknown] => {
      return entry[1] !== undefined;
    }),
  );
}

function requireChanges(body: Record<string, unknown>): void {
  if (Object.keys(body).length === 0) {
    throw new CliError("USAGE", "Provide at least one field to update");
  }
}

export function parseDeviceLoginArguments(
  args: string[],
): Pick<DeviceLoginOptions, "clientName" | "noOpen"> {
  const options = parseOptions(args);
  assertAllowed(options, ["client-name", "no-open"]);
  return {
    clientName: optional(options, "client-name"),
    noOpen: options.get("no-open") === true,
  };
}
