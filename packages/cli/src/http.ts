import {
  type CliCommand,
  type CliConfig,
  CliError,
  type FetchImplementation,
} from "./types.js";

export async function requestJson(
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

export function apiUrl(config: CliConfig, path: string): string {
  return `${config.baseUrl}${path}`;
}

export function jsonHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function safeFetch(
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

export async function responseData(
  response: Response,
): Promise<unknown | undefined> {
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

export function apiError(status: number, data: unknown): CliError {
  const message =
    isRecord(data) && typeof data.error === "string"
      ? data.error
      : `Otter request failed with HTTP ${status}`;
  const code =
    isRecord(data) &&
    typeof data.code === "string" &&
    [
      "EXPENSE_VERSION_REQUIRED",
      "EXPENSE_VERSION_INVALID",
      "EXPENSE_VERSION_CONFLICT",
    ].includes(data.code)
      ? data.code
      : "API_ERROR";
  return new CliError(code, message, status);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
