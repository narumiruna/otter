export type AiAuthMethod = "oauth" | "api_key";

export type AiConnection = { provider: string; method: AiAuthMethod };
export type AiConnectionsResponse = { connections: AiConnection[] };

export type AiAuthEvent =
  | { type: "info"; message: string; links?: { url: string; label?: string }[] }
  | { type: "auth_url"; url: string; instructions?: string }
  | {
      type: "device_code";
      userCode: string;
      verificationUri: string;
      intervalSeconds?: number;
      expiresInSeconds?: number;
    }
  | { type: "progress"; message: string };

export type AiAuthPrompt = { id: string } & (
  | {
      type: "text" | "secret" | "manual_code";
      message: string;
      placeholder?: string;
    }
  | {
      type: "select";
      message: string;
      options: { id: string; label: string; description?: string }[];
    }
);

export type AiLoginState = {
  id: string;
  provider: string;
  method: AiAuthMethod;
  status: "pending" | "complete" | "error";
  events: AiAuthEvent[];
  prompt?: AiAuthPrompt;
};
export type AiLoginResponse = { login: AiLoginState };
