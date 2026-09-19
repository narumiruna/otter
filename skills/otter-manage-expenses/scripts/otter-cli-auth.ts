import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  apiError,
  apiUrl,
  isRecord,
  jsonHeaders,
  requestJson,
  responseData,
  safeFetch,
} from "./otter-cli-http.js";
import {
  type AuthCredential,
  type CliConfig,
  type CliEnvironment,
  CliError,
  type DeviceAuthorization,
  type DeviceLoginOptions,
  type FetchImplementation,
} from "./otter-cli-types.js";

type CredentialFile = {
  servers: Record<string, { accessToken: string; expiresAt: string }>;
  version: 1;
};
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

export function configFromEnvironment(environment: CliEnvironment): CliConfig {
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

export async function credentialFromEnvironment(
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

export async function logoutSession(
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

export function authHeaders(
  credential: AuthCredential,
): Record<string, string> {
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
