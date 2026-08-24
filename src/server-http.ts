import type { Context, Hono, MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { User } from "./server-support.js";

export type OtterEnv = {
  Variables: {
    user: User;
  };
};

export type OtterApp = Hono<OtterEnv>;
export type OtterContext = Context<OtterEnv>;
export type OtterMiddleware = MiddlewareHandler<OtterEnv>;

export type RouteRequest = {
  body: unknown;
  get(name: string): string | undefined;
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
  protocol: string;
};

export class RouteResponse {
  readonly locals: { user?: User };
  response?: Response;
  private readonly headers: Record<string, string> = {};
  private statusCode: ContentfulStatusCode = 200;

  constructor(private readonly context: OtterContext) {
    this.locals = { user: context.get("user") };
  }

  json(value: unknown): void {
    this.response = this.context.json(value, this.statusCode, this.headers);
  }

  send(value: Buffer | string): void {
    this.response = Buffer.isBuffer(value)
      ? this.context.body(new Uint8Array(value), this.statusCode, this.headers)
      : this.context.body(value, this.statusCode, this.headers);
  }

  setHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  status(status: number): this {
    this.statusCode = status as ContentfulStatusCode;
    return this;
  }

  type(contentType: string): this {
    this.headers["Content-Type"] = contentType;
    return this;
  }
}

type Handler = (
  request: RouteRequest,
  response: RouteResponse,
) => Promise<void> | void;

class RequestBodyError extends Error {
  constructor(
    readonly status: 400 | 413,
    message: string,
  ) {
    super(message);
  }
}

export function asyncHandler(handler: Handler): OtterMiddleware {
  return async (context) => {
    let request: RouteRequest;
    try {
      request = await routeRequest(context);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return context.json({ error: error.message }, error.status);
      }
      throw error;
    }

    const response = new RouteResponse(context);
    await handler(request, response);
    return response.response ?? context.body(null, 204);
  };
}

async function routeRequest(context: OtterContext): Promise<RouteRequest> {
  const headers = Object.fromEntries(context.req.raw.headers.entries());
  return {
    body: await parseBody(context),
    get(name) {
      return context.req.header(name);
    },
    headers,
    params: context.req.param(),
    protocol: new URL(context.req.url).protocol.slice(0, -1),
  };
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
