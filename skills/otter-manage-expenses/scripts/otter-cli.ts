import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export type CliEnvironment = Record<string, string | undefined>;

export type CliCommand = {
  body?: Record<string, unknown>;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  select?: "balances" | "expenses" | "participants" | "settlements";
};

type CliConfig = {
  baseUrl: string;
};

type AuthCredential =
  | { cookie: string; kind: "session" }
  | { kind: "token"; token: string };

type CredentialFile = {
  servers: Record<string, { accessToken: string; expiresAt: string }>;
  version: 1;
};

type DeviceAuthorization = {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
};

type DeviceLoginOptions = {
  clientName?: string;
  fetchImplementation?: FetchImplementation;
  noOpen?: boolean;
  onPrompt?: (authorization: DeviceAuthorization) => void;
  openBrowser?: (url: string) => void;
  sleep?: (milliseconds: number) => Promise<void>;
};

type FetchImplementation = typeof fetch;

type ParsedOptions = Map<string, string | true>;

export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

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
  const body = compact({
    amount: optional(options, "amount"),
    category: optional(options, "category"),
    currency: optional(options, "currency"),
    description: optional(options, "description"),
    expenseDate: optional(options, "date"),
    paidById: optional(options, "paid-by"),
    participantIds: optionalList(options, "split-with"),
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

export async function executeCliCommand(
  command: CliCommand,
  environment: CliEnvironment,
  fetchImplementation: FetchImplementation = fetch,
): Promise<unknown> {
  const config = configFromEnvironment(environment);
  const credential = await credentialFromEnvironment(
    config,
    environment,
    fetchImplementation,
  );
  try {
    const data = await requestJson(
      config,
      fetchImplementation,
      command.path,
      command.method,
      authHeaders(credential),
      command.body,
    );
    return selectOutput(data, command.select);
  } finally {
    if (credential.kind === "session") {
      await logoutSession(config, fetchImplementation, credential.cookie);
    }
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

export async function executeDeviceLogin(
  environment: CliEnvironment,
  options: DeviceLoginOptions = {},
): Promise<unknown> {
  const config = configFromEnvironment(environment);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await safeFetch(
    fetchImplementation,
    apiUrl(config, "/api/auth/device"),
    {
      body: JSON.stringify({
        clientName: options.clientName ?? `Otter CLI on ${process.platform}`,
      }),
      headers: jsonHeaders(),
      method: "POST",
    },
  );
  const data = await responseData(response);
  if (!response.ok) {
    throw apiError(response.status, data);
  }
  const responseAuthorization = deviceAuthorizationFromResponse(data);
  const verificationUri = `${config.baseUrl}/device`;
  const authorization = {
    ...responseAuthorization,
    verification_uri: verificationUri,
    verification_uri_complete: `${verificationUri}?code=${encodeURIComponent(responseAuthorization.user_code)}`,
  };
  options.onPrompt?.(authorization);
  if (!options.noOpen) {
    (options.openBrowser ?? openBrowser)(
      authorization.verification_uri_complete,
    );
  }

  const sleep = options.sleep ?? delay;
  const deadline = Date.now() + authorization.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(authorization.interval * 1000);
    const tokenResponse = await safeFetch(
      fetchImplementation,
      apiUrl(config, "/api/auth/device/token"),
      {
        body: JSON.stringify({ device_code: authorization.device_code }),
        headers: jsonHeaders(),
        method: "POST",
      },
    );
    const tokenData = await responseData(tokenResponse);
    if (
      !tokenResponse.ok &&
      isRecord(tokenData) &&
      tokenData.error === "authorization_pending"
    ) {
      continue;
    }
    if (!tokenResponse.ok) {
      throw apiError(tokenResponse.status, tokenData);
    }
    const token = accessTokenFromResponse(tokenData);
    await saveStoredToken(environment, config.baseUrl, token);
    return {
      authenticated: true,
      expiresAt: token.expiresAt,
      server: config.baseUrl,
    };
  }
  throw new CliError(
    "DEVICE_CODE_EXPIRED",
    "The device code expired before it was approved",
  );
}

export async function executeDeviceLogout(
  environment: CliEnvironment,
  fetchImplementation: FetchImplementation = fetch,
): Promise<unknown> {
  const config = configFromEnvironment(environment);
  const token = await tokenFromEnvironment(config, environment);
  if (!token) {
    throw new CliError(
      "CONFIG_ERROR",
      "No API token is configured for this Otter server",
    );
  }
  try {
    await requestJson(
      config,
      fetchImplementation,
      "/api/auth/tokens/current",
      "DELETE",
      { Authorization: `Bearer ${token.value}` },
    );
  } finally {
    if (token.source === "stored") {
      await removeStoredToken(environment, config.baseUrl);
    }
  }
  return { authenticated: false, server: config.baseUrl };
}

function configFromEnvironment(environment: CliEnvironment): CliConfig {
  const rawUrl = environment.OTTER_URL?.trim() || "http://localhost:17463";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new CliError("CONFIG_ERROR", "OTTER_URL must be a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new CliError("CONFIG_ERROR", "OTTER_URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new CliError(
      "CONFIG_ERROR",
      "OTTER_URL must not contain credentials, a query, or a fragment",
    );
  }
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (
    url.protocol === "http:" &&
    !localHosts.has(url.hostname) &&
    environment.OTTER_ALLOW_INSECURE_HTTP !== "1"
  ) {
    throw new CliError(
      "INSECURE_HTTP",
      "Refusing to send credentials over remote HTTP; use HTTPS or explicitly set OTTER_ALLOW_INSECURE_HTTP=1",
    );
  }

  return { baseUrl: url.toString().replace(/\/$/, "") };
}

async function credentialFromEnvironment(
  config: CliConfig,
  environment: CliEnvironment,
  fetchImplementation: FetchImplementation,
): Promise<AuthCredential> {
  const token = await tokenFromEnvironment(config, environment);
  if (token) {
    return { kind: "token", token: token.value };
  }

  const username = environment.OTTER_USERNAME?.trim();
  const password = environment.OTTER_PASSWORD;
  if (username && password) {
    return {
      cookie: await loginSession(
        config,
        fetchImplementation,
        username,
        password,
      ),
      kind: "session",
    };
  }
  throw new CliError(
    "CONFIG_ERROR",
    "Run 'otter auth login' or set OTTER_TOKEN before running a data command",
  );
}

async function loginSession(
  config: CliConfig,
  fetchImplementation: FetchImplementation,
  username: string,
  password: string,
): Promise<string> {
  const response = await safeFetch(
    fetchImplementation,
    apiUrl(config, "/api/auth/login"),
    {
      body: JSON.stringify({ password, username }),
      headers: jsonHeaders(),
      method: "POST",
    },
  );
  const data = await responseData(response);
  if (!response.ok) {
    throw apiError(response.status, data);
  }
  const setCookie = response.headers.get("set-cookie");
  const cookie = setCookie?.split(";", 1)[0];
  if (!cookie) {
    throw new CliError(
      "AUTH_ERROR",
      "Login succeeded without a session cookie",
      response.status,
    );
  }
  return cookie;
}

async function logoutSession(
  config: CliConfig,
  fetchImplementation: FetchImplementation,
  cookie: string,
): Promise<void> {
  try {
    await fetchImplementation(apiUrl(config, "/api/auth/logout"), {
      headers: { ...jsonHeaders(), Cookie: cookie },
      method: "POST",
    });
  } catch {
    // The operation is complete, so session cleanup must not replace its result.
  }
}

async function requestJson(
  config: CliConfig,
  fetchImplementation: FetchImplementation,
  requestPath: string,
  method: CliCommand["method"],
  authorizationHeaders: Record<string, string>,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const response = await safeFetch(
    fetchImplementation,
    apiUrl(config, requestPath),
    {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: { ...jsonHeaders(), ...authorizationHeaders },
      method,
    },
  );
  const data = await responseData(response);
  if (!response.ok) {
    throw apiError(response.status, data);
  }
  if (data === undefined) {
    throw new CliError(
      "RESPONSE_ERROR",
      "Otter returned a successful response without JSON",
      response.status,
    );
  }
  return data;
}

function authHeaders(credential: AuthCredential): Record<string, string> {
  return credential.kind === "token"
    ? { Authorization: `Bearer ${credential.token}` }
    : { Cookie: credential.cookie };
}

function deviceAuthorizationFromResponse(data: unknown): DeviceAuthorization {
  if (
    !isRecord(data) ||
    typeof data.device_code !== "string" ||
    typeof data.expires_in !== "number" ||
    typeof data.interval !== "number" ||
    typeof data.user_code !== "string" ||
    typeof data.verification_uri !== "string" ||
    typeof data.verification_uri_complete !== "string"
  ) {
    throw new CliError(
      "RESPONSE_ERROR",
      "Otter returned an invalid device authorization",
    );
  }
  return {
    device_code: data.device_code,
    expires_in: data.expires_in,
    interval: data.interval,
    user_code: data.user_code,
    verification_uri: data.verification_uri,
    verification_uri_complete: data.verification_uri_complete,
  };
}

function accessTokenFromResponse(data: unknown): {
  accessToken: string;
  expiresAt: string;
} {
  if (
    !isRecord(data) ||
    typeof data.access_token !== "string" ||
    typeof data.expires_at !== "string" ||
    data.token_type !== "Bearer"
  ) {
    throw new CliError("RESPONSE_ERROR", "Otter returned an invalid API token");
  }
  return { accessToken: data.access_token, expiresAt: data.expires_at };
}

async function tokenFromEnvironment(
  config: CliConfig,
  environment: CliEnvironment,
): Promise<{ source: "environment" | "stored"; value: string } | undefined> {
  const environmentToken = environment.OTTER_TOKEN?.trim();
  if (environmentToken) {
    return { source: "environment", value: environmentToken };
  }
  const stored = await readCredentialFile(environment);
  const credential = stored.servers[config.baseUrl];
  if (!credential) {
    return undefined;
  }
  if (new Date(credential.expiresAt).getTime() <= Date.now()) {
    await removeStoredToken(environment, config.baseUrl);
    return undefined;
  }
  return { source: "stored", value: credential.accessToken };
}

async function saveStoredToken(
  environment: CliEnvironment,
  baseUrl: string,
  token: { accessToken: string; expiresAt: string },
): Promise<void> {
  const credentials = await readCredentialFile(environment);
  credentials.servers[baseUrl] = token;
  await writeCredentialFile(environment, credentials);
}

async function removeStoredToken(
  environment: CliEnvironment,
  baseUrl: string,
): Promise<void> {
  const credentials = await readCredentialFile(environment);
  if (!credentials.servers[baseUrl]) {
    return;
  }
  delete credentials.servers[baseUrl];
  await writeCredentialFile(environment, credentials);
}

async function readCredentialFile(
  environment: CliEnvironment,
): Promise<CredentialFile> {
  try {
    const data: unknown = JSON.parse(
      await readFile(credentialFilePath(environment), "utf8"),
    );
    if (!isCredentialFile(data)) {
      throw new CliError(
        "CONFIG_ERROR",
        "The Otter credential file has an invalid format",
      );
    }
    return data;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { servers: {}, version: 1 };
    }
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError(
      "CONFIG_ERROR",
      `Could not read the Otter credential file: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function writeCredentialFile(
  environment: CliEnvironment,
  credentials: CredentialFile,
): Promise<void> {
  const filename = credentialFilePath(environment);
  const directory = path.dirname(filename);
  const temporary = `${filename}.${process.pid}.tmp`;
  try {
    await mkdir(directory, { mode: 0o700, recursive: true });
    await writeFile(temporary, `${JSON.stringify(credentials, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporary, filename);
  } catch (error) {
    throw new CliError(
      "CONFIG_ERROR",
      `Could not save the Otter credential file: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

function credentialFilePath(environment: CliEnvironment): string {
  const configured = environment.OTTER_CONFIG_PATH?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  const configHome =
    environment.XDG_CONFIG_HOME?.trim() ||
    path.join(environment.HOME?.trim() || homedir(), ".config");
  return path.join(configHome, "otter", "credentials.json");
}

function isCredentialFile(value: unknown): value is CredentialFile {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.servers)) {
    return false;
  }
  return Object.values(value.servers).every((credential) => {
    return (
      isRecord(credential) &&
      typeof credential.accessToken === "string" &&
      typeof credential.expiresAt === "string"
    );
  });
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? { executable: "open", arguments: [url] }
      : process.platform === "win32"
        ? {
            executable: "rundll32",
            arguments: ["url.dll,FileProtocolHandler", url],
          }
        : { executable: "xdg-open", arguments: [url] };
  const child = spawn(command.executable, command.arguments, {
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => undefined);
  child.unref();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function apiUrl(config: CliConfig, path: string): string {
  return `${config.baseUrl}${path}`;
}

function jsonHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function safeFetch(
  fetchImplementation: FetchImplementation,
  input: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetchImplementation(input, init);
  } catch (error) {
    throw new CliError(
      "CONNECTION_ERROR",
      error instanceof Error ? error.message : "Could not connect to Otter",
    );
  }
}

async function responseData(response: Response): Promise<unknown | undefined> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    if (!response.ok) {
      return { error: text };
    }
    throw new CliError(
      "RESPONSE_ERROR",
      "Otter returned invalid JSON",
      response.status,
    );
  }
}

function apiError(status: number, data: unknown): CliError {
  const message =
    isRecord(data) && typeof data.error === "string"
      ? data.error
      : `Otter request failed with HTTP ${status}`;
  return new CliError("API_ERROR", message, status);
}

function selectOutput(data: unknown, select: CliCommand["select"]): unknown {
  if (!select) {
    return data;
  }
  if (!isRecord(data) || !isRecord(data.trip)) {
    throw new CliError(
      "RESPONSE_ERROR",
      "Otter returned an unexpected payload",
    );
  }
  switch (select) {
    case "participants":
      return { participants: data.trip.participants };
    case "expenses":
      return { expenses: data.trip.expenses };
    case "balances":
      return { balances: data.balances, settlements: data.settlements };
    case "settlements":
      return {
        payments: data.trip.settlementPayments ?? [],
        settlements: data.settlements,
      };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function errorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof CliError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.status === undefined ? {} : { status: error.status }),
      },
    };
  }
  return {
    error: {
      code: "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error",
    },
  };
}
