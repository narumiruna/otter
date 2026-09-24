import type { DeviceAuthorization } from "@narumitw/otter-contracts";

export type CliEnvironment = Record<string, string | undefined>;

export type CliCommand = {
  authenticatedUserRequired?: true;
  body?: Record<string, unknown>;
  file?: string;
  headers?: { "If-Match": string };
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  select?: "balances" | "expenses" | "participants" | "settlements";
};

export type CliConfig = {
  baseUrl: string;
};

export type { DeviceAuthorization } from "@narumitw/otter-contracts";

export type DeviceLoginOptions = {
  clientName?: string;
  fetchImplementation?: FetchImplementation;
  noOpen?: boolean;
  onPrompt?: (authorization: DeviceAuthorization) => void;
  openBrowser?: (url: string) => void;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type FetchImplementation = typeof fetch;

export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
