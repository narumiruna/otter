import type {
  AiConnectionsResponse,
  AiLoginResponse,
} from "@narumitw/otter-contracts";
import type { Pool as PgPool } from "pg";
import { aiCredentialStore } from "./server-ai-credentials.js";
import { AiLoginBroker, aiBrowserSession } from "./server-ai-logins.js";
import {
  type AiProviderLogin,
  aiAuthMethods,
  aiProviders,
} from "./server-ai-providers.js";
import type { OtterApp, OtterContext, OtterMiddleware } from "./server-http.js";
import { parseRequestBody } from "./server-http.js";
import { currentUser, getCookie, sendError } from "./server-support.js";

export type AiAuthOptions = { login?: AiProviderLogin };

function owner(context: OtterContext): [string, string] {
  return [
    currentUser(context).id,
    aiBrowserSession(getCookie(context.req.raw, "otter_session") ?? ""),
  ];
}

function exactBody(
  value: unknown,
  fields: string[],
): value is Record<string, string> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every(
      (field) =>
        field in value && typeof Reflect.get(value, field) === "string",
    )
  );
}

export function registerAiAuthRoutes(
  app: OtterApp,
  pool: PgPool,
  key: Buffer | undefined,
  options: AiAuthOptions,
) {
  const store = aiCredentialStore(pool, key);
  const broker = key
    ? new AiLoginBroker(key, store.save, options.login)
    : undefined;
  app.get("/api/auth/ai/connections", async (context) =>
    context.json({
      connections: await store.list(currentUser(context).id),
    } satisfies AiConnectionsResponse),
  );

  app.post("/api/auth/ai/logins", parseRequestBody, (context) => {
    const body = context.get("requestBody");
    if (!exactBody(body, ["provider", "method"]))
      return sendError(context, 400, "Invalid AI login");
    const provider = aiProviders.find(({ id }) => id === body.provider);
    const method = body.method;
    if (
      !provider ||
      (method !== "oauth" && method !== "api_key") ||
      !aiAuthMethods(provider).includes(method)
    ) {
      return sendError(context, 400, "Unsupported AI authentication method");
    }
    if (!broker)
      return sendError(context, 503, "AI authentication is disabled");
    const login = broker.start(...owner(context), provider, method);
    if (!login)
      return sendError(
        context,
        429,
        "Too many AI logins. Cancel a login or retry later.",
      );
    return context.json({ login } satisfies AiLoginResponse, 201);
  });

  app.get("/api/auth/ai/logins/:id", (context) => {
    const login = broker?.get(...owner(context), context.req.param("id"));
    if (!login) return sendError(context, 404, "AI login not found");
    return context.json({ login } satisfies AiLoginResponse);
  });

  app.post("/api/auth/ai/logins/:id/respond", parseRequestBody, (context) => {
    const body = context.get("requestBody");
    if (!exactBody(body, ["promptId", "value"]))
      return sendError(context, 400, "Invalid AI response");
    const login = broker?.respond(
      ...owner(context),
      context.req.param("id"),
      body.promptId ?? "",
      body.value ?? "",
    );
    if (!login) return sendError(context, 404, "AI login not found");
    if (login === "invalid")
      return sendError(context, 400, "Invalid or expired AI prompt response");
    return context.json({ login } satisfies AiLoginResponse);
  });

  app.delete("/api/auth/ai/logins/:id", async (context) => {
    if (!(await broker?.cancel(...owner(context), context.req.param("id"))))
      return sendError(context, 404, "AI login not found");
    return context.json({ ok: true });
  });

  app.delete("/api/auth/ai/connections/:provider", async (context) => {
    const user = currentUser(context).id;
    const provider = context.req.param("provider");
    await broker?.cancelProvider(user, provider);
    await store.disconnect(user, provider);
    return context.json({ ok: true });
  });
}

export function aiBrowserOnly(
  mustHaveBrowserSession: OtterMiddleware,
): OtterMiddleware {
  return async (context, next) => {
    context.header("Cache-Control", "no-store");
    if (
      context.req.header("authorization") !== undefined ||
      context.req.header("X-Otter-Share-Token") !== undefined
    ) {
      return sendError(context, 401, "請先登入");
    }
    try {
      return await mustHaveBrowserSession(context, next);
    } catch {
      return sendError(context, 500, "AI account operation failed");
    }
  };
}

export const aiSameOrigin: OtterMiddleware = async (context, next) => {
  if (["GET", "HEAD"].includes(context.req.method)) return next();
  const origin = context.req.header("Origin");
  let invalidOrigin = false;
  if (origin !== undefined) {
    try {
      const url = new URL(origin);
      invalidOrigin =
        !["http:", "https:"].includes(url.protocol) ||
        url.origin !== origin ||
        url.host !==
          (context.req.header("Host") ?? new URL(context.req.url).host);
    } catch {
      invalidOrigin = true;
    }
  }
  // Do not trust Forwarded or X-Forwarded-Host. A proxy must preserve Host.
  if (invalidOrigin || context.req.header("Sec-Fetch-Site") === "cross-site")
    return sendError(context, 403, "Cross-site AI mutation denied");
  if (
    context.req
      .header("Content-Type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() !== "application/json"
  ) {
    return sendError(context, 400, "AI mutations require application/json");
  }
  return next();
};
