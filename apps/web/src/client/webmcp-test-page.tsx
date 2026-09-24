import { useEffect, useState } from "react";

// Public demo data only. Never read the signed-in workspace or call an API here.
const demoBalances = {
  trip: "WebMCP 示範群組",
  currency: "TWD",
  unit: "minor",
  total: 2,
  balances: [
    { name: "Alice", amountMinor: -500, currency: "TWD" },
    { name: "Bob", amountMinor: 500, currency: "TWD" },
  ],
  truncated: false,
};
const demoSettlements = {
  trip: "WebMCP 示範群組",
  currency: "TWD",
  unit: "minor",
  total: 1,
  settlements: [
    { from: "Alice", to: "Bob", amountMinor: 500, currency: "TWD" },
  ],
  truncated: false,
};

const tools = [
  {
    name: "otter_demo_balances",
    description:
      "Read the public Otter demo group's participant balances. Fixed example data only; amounts are signed minor currency units.",
    execute: async () => JSON.stringify(demoBalances),
  },
  {
    name: "otter_demo_settlements",
    description:
      "Read the public Otter demo group's suggested payments. Fixed example data only; no payment is recorded.",
    execute: async () => JSON.stringify(demoSettlements),
  },
].map((tool) => ({
  ...tool,
  inputSchema: {
    type: "object" as const,
    properties: {},
    additionalProperties: false as const,
  },
  annotations: {
    readOnlyHint: true as const,
    untrustedContentHint: true as const,
  },
}));

type DemoTool = (typeof tools)[number];
type ModelContext = {
  registerTool: (
    tool: DemoTool,
    options: { signal: AbortSignal },
  ) => Promise<void>;
};

export function WebMcpTestPage() {
  const [status, setStatus] = useState("正在檢查 WebMCP…");

  useEffect(() => {
    const context: unknown = Reflect.get(document, "modelContext");
    if (
      !context ||
      typeof context !== "object" ||
      !("registerTool" in context) ||
      typeof context.registerTool !== "function"
    ) {
      setStatus("此瀏覽器頁面沒有 document.modelContext，無法註冊工具。");
      return;
    }

    const controller = new AbortController();
    const modelContext = context as ModelContext;
    void Promise.all(
      tools.map((tool) =>
        Promise.resolve().then(() => {
          if (controller.signal.aborted) return;
          return modelContext.registerTool(tool, { signal: controller.signal });
        }),
      ),
    ).then(
      () => {
        if (!controller.signal.aborted) setStatus("已註冊 2 個唯讀示範工具。");
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        controller.abort();
        setStatus(
          `工具註冊失敗：${error instanceof Error || error instanceof DOMException ? error.message : "未知錯誤"}`,
        );
      },
    );
    return () => controller.abort();
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand-row no-underline" href="/">
          <img
            className="brand-mark"
            src="/icon.svg"
            alt=""
            width={44}
            height={44}
          />
          <span className="brand-name">otter</span>
        </a>
      </header>
      <main className="mx-auto grid max-w-3xl gap-6" id="main-content">
        <section className="surface grid gap-4">
          <h1>WebMCP 測試頁</h1>
          <p>
            公開、不需登入。工具只回傳固定假資料，不會讀取帳號或群組，也不會寫入資料。
          </p>
          <p role="status">{status}</p>
          <p>
            請讓支援 WebMCP 的瀏覽器助理在此頁重新探索工具。若瀏覽器沒有提供
            <code>document.modelContext</code>，請使用支援 WebMCP 的 Chrome
            與測試旗標，或確認 HTTPS、origin trial 及 tools Permissions Policy
            設定。
          </p>
        </section>
        <section className="surface grid gap-4">
          <h2>示範工具與預期結果</h2>
          <p>金額單位為 TWD 的 minor units（500 = NT$5.00）。</p>
          {tools.map((tool, index) => (
            <div key={tool.name}>
              <h3>
                <code>{tool.name}</code>
              </h3>
              <pre className="overflow-x-auto">
                <code>
                  {JSON.stringify(
                    index === 0 ? demoBalances : demoSettlements,
                    null,
                    2,
                  )}
                </code>
              </pre>
            </div>
          ))}
          <a href="/">返回 otter</a>
        </section>
      </main>
    </div>
  );
}
