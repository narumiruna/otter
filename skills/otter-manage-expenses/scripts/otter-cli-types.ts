export type CliEnvironment = Record<string, string | undefined>;

export type CliCommand = {
  authenticatedUserRequired?: true;
  body?: Record<string, unknown>;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  select?: "balances" | "expenses" | "participants" | "settlements";
};

export type CliConfig = {
  baseUrl: string;
};

export type AuthCredential = { kind: "token"; token: string };

export type DeviceAuthorization = {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
};

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
