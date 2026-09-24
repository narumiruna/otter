// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { WebMcpTestPage } from "./webmcp-test-page.js";

type Tool = {
  name: string;
  inputSchema: {
    properties: Record<string, unknown>;
    additionalProperties: boolean;
  };
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: () => Promise<string>;
};

const registrations: { tool: Tool; signal: AbortSignal }[] = [];

afterEach(() => {
  registrations.length = 0;
  Reflect.deleteProperty(document, "modelContext");
  vi.unstubAllGlobals();
});

test("offers only fixed public demo data without fetching a private group", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No API calls allowed");
    }),
  );
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: async (tool: Tool, { signal }: { signal: AbortSignal }) => {
        registrations.push({ tool, signal });
      },
    },
  });

  const view = render(<WebMcpTestPage />);
  await waitFor(() => expect(registrations).toHaveLength(2));
  expect(view.getByRole("status")).toHaveTextContent("已註冊 2 個唯讀示範工具");
  expect(registrations.map(({ tool }) => tool.name)).toEqual([
    "otter_demo_balances",
    "otter_demo_settlements",
  ]);
  for (const { tool } of registrations) {
    expect(tool.inputSchema).toMatchObject({
      properties: {},
      additionalProperties: false,
    });
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
  }
  expect(JSON.parse(await registrations[0].tool.execute())).toMatchObject({
    trip: "WebMCP 示範群組",
    total: 2,
    balances: [
      { name: "Alice", amountMinor: -500, currency: "TWD" },
      { name: "Bob", amountMinor: 500, currency: "TWD" },
    ],
  });
  expect(JSON.parse(await registrations[1].tool.execute())).toMatchObject({
    settlements: [{ from: "Alice", to: "Bob", amountMinor: 500 }],
  });
  expect(fetch).not.toHaveBeenCalled();
  view.unmount();
  expect(registrations.every(({ signal }) => signal.aborted)).toBe(true);
});

test("explains when the browser does not expose WebMCP", () => {
  const view = render(<WebMcpTestPage />);
  expect(view.getByRole("status")).toHaveTextContent(
    "沒有 document.modelContext",
  );
});

test("shows registration failures instead of claiming tools are ready", async () => {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: async () => {
        throw new DOMException("Not allowed", "NotAllowedError");
      },
    },
  });
  const view = render(<WebMcpTestPage />);
  await waitFor(() =>
    expect(view.getByRole("status")).toHaveTextContent(
      "工具註冊失敗：Not allowed",
    ),
  );
});
