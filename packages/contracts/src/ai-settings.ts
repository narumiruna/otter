import type { AiAuthMethod } from "./ai-auth.js";

export type AiThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type AiSettings = {
  provider: string;
  model: string;
  thinkingLevel: AiThinkingLevel;
};

export type AiModelOption = {
  id: string;
  name: string;
  thinkingLevels: AiThinkingLevel[];
};

export type AiProviderOption = {
  id: string;
  name: string;
  authMethods: AiAuthMethod[];
  models: AiModelOption[];
};

export type AiSettingsResponse = { settings: AiSettings | null };
export type AiCatalogResponse = {
  providers: AiProviderOption[];
  authenticationEnabled: boolean;
};

export function isAiSettings(value: unknown): value is AiSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return (
    Object.keys(value).length === 3 &&
    "provider" in value &&
    typeof value.provider === "string" &&
    value.provider.trim().length > 0 &&
    "model" in value &&
    typeof value.model === "string" &&
    value.model.trim().length > 0 &&
    "thinkingLevel" in value &&
    (value.thinkingLevel === "off" ||
      value.thinkingLevel === "minimal" ||
      value.thinkingLevel === "low" ||
      value.thinkingLevel === "medium" ||
      value.thinkingLevel === "high" ||
      value.thinkingLevel === "xhigh" ||
      value.thinkingLevel === "max")
  );
}
