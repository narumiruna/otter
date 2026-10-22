import type { ProviderAuthInteraction } from "@earendil-works/pi-ai";
import { afterEach, expect, test, vi } from "vitest";
import {
  aiAuthMethods,
  aiProviders,
  loginAiProvider,
  validAiPromptValue,
} from "./server-ai-providers.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
function provider(id: string) {
  const value = aiProviders.find((provider) => provider.id === id);
  if (!value) throw new Error("Missing provider");
  return value;
}

test("API keys use provider.auth.apiKey.login with no remote verification or model calls", async () => {
  vi.stubEnv("OPENAI_API_KEY", "server-key-not-used");
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("No network allowed"));
  const openai = provider("openai");
  if (!openai.auth.apiKey?.login) throw new Error("Missing API-key login");
  const login = vi.spyOn(openai.auth.apiKey, "login");
  const interaction: ProviderAuthInteraction = {
    signal: new AbortController().signal,
    prompt: vi.fn(async () => "user-key"),
    notify: vi.fn(),
  };
  expect(await loginAiProvider(openai, "api_key", interaction, {})).toEqual({
    type: "api_key",
    key: "user-key",
  });
  expect(login).toHaveBeenCalledWith(interaction);
  expect(fetch).not.toHaveBeenCalled();
  expect(interaction.notify).not.toHaveBeenCalled();
});

test("OAuth delegates state and PKCE handling to provider.auth.oauth.login", async () => {
  const openai = provider("openai");
  if (!openai.auth.oauth) throw new Error("Missing OAuth");
  const credential = {
    type: "oauth",
    access: "access",
    refresh: "refresh",
    expires: 123,
  } as const;
  const login = vi
    .spyOn(openai.auth.oauth, "login")
    .mockResolvedValue(credential);
  const interaction: ProviderAuthInteraction = {
    signal: new AbortController().signal,
    prompt: async () => "code",
    notify: () => {},
  };
  const options = { agentName: "otter", getDeviceId: () => "stable-id" };
  expect(await loginAiProvider(openai, "oauth", interaction, options)).toEqual(
    credential,
  );
  expect(login).toHaveBeenCalledWith(interaction, options);
});

test("ambient SDK endpoint/callback overrides fail closed and Radius OAuth is not offered", async () => {
  expect(aiAuthMethods(provider("radius"))).toEqual(["api_key"]);
  const openai = provider("openai");
  if (!openai.auth.oauth) throw new Error("Missing OAuth");
  const login = vi.spyOn(openai.auth.oauth, "login");
  for (const name of [
    "PI_OAUTH_CALLBACK_HOST",
    "KIMI_CODE_OAUTH_HOST",
    "KIMI_OAUTH_HOST",
  ]) {
    vi.stubEnv(name, "http://localhost");
    await expect(
      loginAiProvider(
        openai,
        "oauth",
        {
          signal: new AbortController().signal,
          prompt: async () => "",
          notify: () => {},
        },
        {},
      ),
    ).rejects.toThrow();
    vi.unstubAllEnvs();
  }
  expect(login).not.toHaveBeenCalled();
});

test("Cloudflare identifiers cannot inject paths, hosts, or query parameters", () => {
  const prompt = { type: "text", message: "Account ID" } as const;
  for (const value of [
    "../admin",
    "https://localhost",
    "id?target=localhost",
    "id/account",
    "",
    "x".repeat(129),
  ]) {
    expect(validAiPromptValue("cloudflare-ai-gateway", prompt, value)).toBe(
      false,
    );
  }
  expect(
    validAiPromptValue("cloudflare-ai-gateway", prompt, "account_123-abc"),
  ).toBe(true);
});
