import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Pool } from "pg";
import {
  bearerTokenFromRequest,
  userFromApiToken,
} from "./server-api-tokens.js";
import type { OtterApp } from "./server-http.js";
import { createMcpServer } from "./server-mcp-tools.js";

export function registerMcpRoutes(app: OtterApp, pool: Pool): void {
  const configuredOrigin = process.env.PASSKEY_ORIGIN?.trim();
  const publicOrigin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : undefined;
  app.all("/mcp", async (context) => {
    context.header("Cache-Control", "no-store");
    const request = context.req.raw;
    const origin = request.headers.get("origin");
    if (
      origin !== null &&
      origin !== (publicOrigin ?? new URL(request.url).origin)
    ) {
      return context.json({ error: "Origin not allowed" }, 403);
    }

    const token = bearerTokenFromRequest(request);
    if (!token || !(await userFromApiToken(pool, token))) {
      context.header("WWW-Authenticate", 'Bearer realm="otter"');
      return context.json(
        { error: "A valid Otter API token is required" },
        401,
      );
    }

    if (request.method !== "POST") {
      context.header("Allow", "POST");
      return context.json({ error: "Method not allowed" }, 405);
    }

    // Bound the body before parsing. Do not accept legacy JSON-RPC batches:
    // cancellation within a batch can leave the SDK JSON response unresolved.
    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return context.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: "Content-Type must be application/json",
          },
        },
        415,
      );
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1024 * 1024) {
            await reader.cancel();
            return context.json({ error: "Request body exceeds 1 MiB" }, 413);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return context.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Invalid JSON" },
        },
        400,
      );
    }
    if (Array.isArray(parsedBody)) {
      return context.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32600,
            message: "JSON-RPC batches are not supported",
          },
        },
        400,
      );
    }

    // Each stateless request owns its server, credential, and transport.
    // Never forward cookies, share credentials, or caller-selected URLs.
    const server = createMcpServer((path, init) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return app.fetch(
        new Request(new URL(path, request.url), {
          ...init,
          headers,
          signal: request.signal,
        }),
      );
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request, { parsedBody });
      response.headers.set("Cache-Control", "no-store");
      return response;
    } finally {
      await server.close();
    }
  });
}
