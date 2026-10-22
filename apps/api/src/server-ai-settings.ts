import { getSupportedThinkingLevels } from "@earendil-works/pi-ai/models";
import {
  getBuiltinModels,
  getBuiltinProviders,
} from "@earendil-works/pi-ai/providers/all";
import {
  type AiCatalogResponse,
  type AiSettings,
  type AiSettingsResponse,
  isAiSettings,
} from "@narumitw/otter-contracts";
import type { Pool as PgPool } from "pg";
import {
  type AiAuthOptions,
  aiBrowserOnly,
  aiSameOrigin,
  registerAiAuthRoutes,
} from "./server-ai-auth.js";
import { aiCredentialsKey, withAiUserLock } from "./server-ai-credentials.js";
import { aiAuthMethods, aiProviders } from "./server-ai-providers.js";
import type { OtterApp, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import { currentUser, sendError } from "./server-support.js";

// Read only the packaged chat catalog. Do not resolve auth or refresh models.
const providers: AiCatalogResponse["providers"] = getBuiltinProviders()
  .map((id) => {
    const provider = aiProviders.find((provider) => provider.id === id);
    if (!provider) throw new Error("Missing built-in AI provider");
    return {
      id,
      name: provider.name ?? id,
      authMethods: aiAuthMethods(provider),
      models: getBuiltinModels(id).map((model) => ({
        id: model.id,
        name: model.name,
        thinkingLevels: getSupportedThinkingLevels(model),
      })),
    };
  })
  .filter((provider) => provider.models.length > 0);

export function registerAiSettingsRoutes(
  app: OtterApp,
  pool: PgPool,
  mustHaveBrowserSession: OtterMiddleware,
  options: AiAuthOptions = {},
) {
  const key = aiCredentialsKey(process.env.ENCRYPTION_KEY);
  app.use(
    "/api/auth/ai/*",
    aiBrowserOnly(mustHaveBrowserSession),
    aiSameOrigin,
  );
  registerAiAuthRoutes(app, pool, key, options);
  app.get("/api/auth/ai/catalog", (context) =>
    context.json({
      providers,
      authenticationEnabled: !!key,
    } satisfies AiCatalogResponse),
  );

  app.get("/api/auth/ai/settings", async (context) => {
    const result = await pool.query<AiSettings>(
      `SELECT provider, model, thinking_level AS "thinkingLevel"
       FROM user_ai_settings WHERE user_id = $1`,
      [currentUser(context).id],
    );
    return context.json({
      settings: result.rows[0] ?? null,
    } satisfies AiSettingsResponse);
  });

  app.put("/api/auth/ai/settings", parseRequestBody, async (context) => {
    const body = context.get("requestBody");
    if (!isAiSettings(body)) {
      return sendError(context, 400, "Invalid AI settings");
    }
    const provider = providers.find(({ id }) => id === body.provider);
    const model = provider?.models.find(({ id }) => id === body.model);
    if (!model) {
      return sendError(context, 400, "Unknown AI provider or model");
    }
    if (!model.thinkingLevels.includes(body.thinkingLevel)) {
      return sendError(context, 400, "Unsupported AI thinking level");
    }
    const user = currentUser(context).id;
    const result = await withAiUserLock(pool, user, async (client) => {
      const connection = await client.query(
        "SELECT provider FROM user_ai_credentials WHERE user_id = $1 AND provider = $2",
        [user, body.provider],
      );
      if (!connection.rowCount) return undefined;
      return client.query<AiSettings>(
        `INSERT INTO user_ai_settings (user_id, provider, model, thinking_level)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET provider = EXCLUDED.provider,
             model = EXCLUDED.model,
             thinking_level = EXCLUDED.thinking_level
         RETURNING provider, model, thinking_level AS "thinkingLevel"`,
        [user, body.provider, body.model, body.thinkingLevel],
      );
    });
    if (!result)
      return sendError(
        context,
        400,
        "Connect this AI provider before saving settings",
      );
    return context.json({
      settings: result.rows[0],
    } satisfies AiSettingsResponse);
  });
}
