import type {
  AuthPrompt,
  Credential,
  LoginOptions,
  Provider,
  ProviderAuthInteraction,
} from "@earendil-works/pi-ai";
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import type { AiAuthMethod } from "@narumitw/otter-contracts";

// Factories and static catalogs only: never call resolve/check/refresh/getAuth.
export const aiProviders = builtinProviders();

export function aiAuthMethods(provider: Provider): AiAuthMethod[] {
  const methods: AiAuthMethod[] = [];
  if (provider.auth.oauth && !["openai", "radius"].includes(provider.id))
    methods.push("oauth");
  if (provider.auth.apiKey?.login) methods.push("api_key");
  return methods;
}

export type AiProviderLogin = (
  provider: Provider,
  method: AiAuthMethod,
  interaction: ProviderAuthInteraction,
  options: LoginOptions,
) => Promise<Credential>;

export const loginAiProvider: AiProviderLogin = async (
  provider,
  method,
  interaction,
  options,
) => {
  if (!aiAuthMethods(provider).includes(method))
    throw new Error("Unsupported method");
  if (method === "oauth") {
    // These SDK overrides bypass AuthContext. Fail closed rather than inherit them
    // or mutate the shared process environment in a multi-user server.
    if (
      [
        "PI_OAUTH_CALLBACK_HOST",
        "KIMI_CODE_OAUTH_HOST",
        "KIMI_OAUTH_HOST",
      ].some((name) => process.env[name])
    ) {
      throw new Error("Unsupported ambient OAuth configuration");
    }
    if (!provider.auth.oauth) throw new Error("Unsupported method");
    return provider.auth.oauth.login(interaction, options);
  }
  if (!provider.auth.apiKey?.login) throw new Error("Unsupported method");
  return provider.auth.apiKey.login(interaction);
};

// Keep local-file/ambient choices and callback login methods off the wire.
export function automaticAiChoice(
  provider: string,
  method: AiAuthMethod,
  prompt: AuthPrompt,
): string | undefined {
  if (provider === "openai-codex" && method === "oauth") {
    if (
      prompt.type !== "select" ||
      !Array.isArray(prompt.options) ||
      prompt.options.length !== 2 ||
      prompt.options.filter(({ id }) => id === "device_code").length !== 1 ||
      prompt.options.filter(({ id }) => id === "browser").length !== 1 ||
      prompt.options.some(({ label }) => typeof label !== "string")
    )
      throw new Error("Unsupported SDK prompt");
    return "device_code";
  }
  if (prompt.type !== "select") return undefined;
  const choice =
    method === "oauth" && provider === "anthropic"
      ? "copy_code"
      : method === "api_key" && provider === "amazon-bedrock"
        ? "bearer-token"
        : method === "api_key" && provider === "google-vertex"
          ? "api-key"
          : undefined;
  if (choice && !prompt.options.some(({ id }) => id === choice))
    throw new Error("Unsupported SDK prompt");
  return choice;
}

export function supportedAiPrompt(
  provider: string,
  method: AiAuthMethod,
  prompt: AuthPrompt,
): boolean {
  if (prompt.type === "secret") return method === "api_key";
  if (prompt.type === "manual_code") return method === "oauth";
  if (prompt.type === "text")
    return (
      (provider === "github-copilot" && method === "oauth") ||
      (method === "api_key" &&
        ["cloudflare-ai-gateway", "cloudflare-workers-ai"].includes(provider))
    );
  return false;
}

export function validAiPromptValue(
  provider: string,
  prompt: AuthPrompt,
  value: string,
): boolean {
  if (value.length > 16_384 || value.includes("\0")) return false;
  if (prompt.type === "select")
    return prompt.options.some(({ id }) => id === value);
  if (prompt.type === "text" && provider === "github-copilot")
    return value.trim() === "" || value.trim() === "github.com";
  if (prompt.type === "text") return /^[A-Za-z0-9_-]{1,128}$/.test(value);
  return value.trim().length > 0;
}
