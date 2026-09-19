import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import * as lockfile from "proper-lockfile";
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
  if (environment.OTTER_TOKEN?.trim()) {
    throw new CliError(
      "CONFIG_ERROR",
      "Unset OTTER_TOKEN before saving a device-authorized login",
    );
  }
  return withCredentialLock(environment, () =>
    executeDeviceLoginLocked(environment, options, config),
  );
}

async function executeDeviceLoginLocked(
  environment: CliEnvironment,
  options: DeviceLoginOptions,
  config: CliConfig,
): Promise<unknown> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const previousToken = await storedTokenFromEnvironment(
    environment,
    config.baseUrl,
    true,
  );
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
    try {
      await saveStoredToken(environment, config.baseUrl, token);
    } catch (error) {
      try {
        await revokeToken(config, fetchImplementation, token.accessToken);
      } catch {
        // Preserve the credential persistence failure for the caller.
      }
      throw error;
    }
    if (previousToken && previousToken.accessToken !== token.accessToken) {
      try {
        await revokeToken(
          config,
          fetchImplementation,
          previousToken.accessToken,
        );
      } catch (error) {
        try {
          await revokeToken(config, fetchImplementation, token.accessToken);
        } catch {
          // Preserve the original rotation failure for the caller.
        }
        await saveStoredToken(environment, config.baseUrl, previousToken);
        throw error;
      }
    }
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
  return withCredentialLock(environment, () =>
    executeDeviceLogoutLocked(environment, fetchImplementation, config),
  );
}

async function executeDeviceLogoutLocked(
  environment: CliEnvironment,
  fetchImplementation: FetchImplementation,
  config: CliConfig,
): Promise<unknown> {
  const environmentToken = environment.OTTER_TOKEN?.trim() || undefined;
  const storedToken = await storedTokenFromEnvironment(
    environment,
    config.baseUrl,
    true,
  );
  if (!environmentToken && !storedToken) {
    throw new CliError(
      "CONFIG_ERROR",
      "No API token is configured for this Otter server",
    );
  }

  if (environmentToken) {
    await revokeToken(config, fetchImplementation, environmentToken);
  }
  if (storedToken && storedToken.accessToken !== environmentToken) {
    await revokeToken(config, fetchImplementation, storedToken.accessToken);
  }
  if (storedToken) {
    await removeStoredToken(
      environment,
      config.baseUrl,
      storedToken.accessToken,
    );
  }
  return { authenticated: false, server: config.baseUrl };
}

async function revokeToken(
  config: CliConfig,
  fetchImplementation: FetchImplementation,
  token: string,
): Promise<void> {
  try {
    await requestJson(
      config,
      fetchImplementation,
      "/api/auth/tokens/current",
      "DELETE",
      { Authorization: `Bearer ${token}` },
    );
  } catch (error) {
    if (
      error instanceof CliError &&
      (error.status === 401 || error.status === 404)
    ) {
      return;
    }
    throw error;
  }
}

export function configFromEnvironment(environment: CliEnvironment): CliConfig {
  const rawUrl = environment.OTTER_URL?.trim() || "https://otter.narumi.dev/";
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
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
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
): Promise<AuthCredential> {
  const token = await tokenFromEnvironment(config, environment);
  if (token) {
    return { kind: "token", token: token.value };
  }
  throw new CliError(
    "CONFIG_ERROR",
    "Run 'otter auth login' or set OTTER_TOKEN before running a data command",
  );
}

export function authHeaders(
  credential: AuthCredential,
): Record<string, string> {
  return { Authorization: `Bearer ${credential.token}` };
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
  const credential = await storedTokenFromEnvironment(
    environment,
    config.baseUrl,
  );
  return credential
    ? { source: "stored", value: credential.accessToken }
    : undefined;
}

async function storedTokenFromEnvironment(
  environment: CliEnvironment,
  baseUrl: string,
  lockHeld = false,
): Promise<CredentialFile["servers"][string] | undefined> {
  const stored = await readCredentialFile(environment);
  const credential = stored.servers[baseUrl];
  if (!credential) {
    return undefined;
  }
  if (new Date(credential.expiresAt).getTime() > Date.now()) {
    return credential;
  }
  if (lockHeld) {
    await removeStoredToken(environment, baseUrl, credential.accessToken);
    return undefined;
  }
  return withCredentialLock(environment, async () => {
    const current = (await readCredentialFile(environment)).servers[baseUrl];
    if (!current) {
      return undefined;
    }
    if (new Date(current.expiresAt).getTime() > Date.now()) {
      return current;
    }
    await removeStoredToken(environment, baseUrl, current.accessToken);
    return undefined;
  });
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
  expectedAccessToken: string,
): Promise<void> {
  const credentials = await readCredentialFile(environment);
  if (credentials.servers[baseUrl]?.accessToken !== expectedAccessToken) {
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

async function withCredentialLock<T>(
  environment: CliEnvironment,
  operation: () => Promise<T>,
): Promise<T> {
  const filename = credentialFilePath(environment);
  await mkdir(path.dirname(filename), { mode: 0o700, recursive: true });

  let release: () => Promise<void>;
  try {
    release = await lockfile.lock(filename, {
      realpath: false,
      retries: {
        factor: 1,
        maxTimeout: 100,
        minTimeout: 100,
        randomize: false,
        retries: 6_600,
      },
      stale: 11 * 60 * 1000,
      update: 30_000,
    });
  } catch (error) {
    throw new CliError(
      "CONFIG_ERROR",
      `Could not lock the Otter credential file: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  try {
    return await operation();
  } finally {
    await release();
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
