import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, Hono, MiddlewareHandler } from "hono";
import type { User } from "./server-support.js";

export type OtterEnv = {
  Variables: {
    user: User;
    requestBody: unknown;
  };
};

export type OtterApp = Hono<OtterEnv>;
export type OtterContext = Context<OtterEnv>;
export type OtterMiddleware = MiddlewareHandler<OtterEnv>;

class RequestBodyError extends Error {
  constructor(
    readonly status: 400 | 413,
    message: string,
  ) {
    super(message);
  }
}

// Register after authentication on protected routes, before route validation.
export const parseRequestBody: OtterMiddleware = async (context, next) => {
  try {
    context.set("requestBody", await parseBody(context));
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return context.json({ error: error.message }, error.status);
    }
    throw error;
  }
  await next();
};

export function requestRemoteAddress(
  context: OtterContext,
): string | undefined {
  try {
    return getConnInfo(context).remote.address;
  } catch {
    return undefined;
  }
}

async function parseBody(context: OtterContext): Promise<unknown> {
  if (context.req.method === "GET" || context.req.method === "HEAD") {
    return {};
  }

  const contentType = context.req
    .header("Content-Type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (!contentType) {
    return {};
  }

  const bytes = new Uint8Array(await context.req.arrayBuffer());
  const limit = context.req.path === "/api/trips/restore" ? 10 : 1;
  const limitBytes = limit * 1024 * 1024;
  if (bytes.byteLength > limitBytes && contentType === "application/json") {
    throw new RequestBodyError(413, "請求內容太大");
  }

  if (contentType === "application/json") {
    if (bytes.byteLength === 0) {
      return {};
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new RequestBodyError(400, "JSON 格式錯誤");
    }
  }

  if (
    contentType === "image/jpeg" ||
    contentType === "image/png" ||
    contentType === "image/webp"
  ) {
    if (bytes.byteLength > 5 * 1024 * 1024) {
      throw new RequestBodyError(413, "請求內容太大");
    }
    return Buffer.from(bytes);
  }

  return Buffer.from(bytes);
}
