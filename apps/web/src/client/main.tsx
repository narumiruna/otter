import "@radix-ui/themes/styles.css";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { AppShell } from "./app-shell.js";
import { I18nProvider } from "./i18n.js";
import { RadixTheme } from "./radix-theme.js";

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) {
  throw new Error("Missing #app");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
    },
  },
});

createRoot(rootElement).render(
  <I18nProvider>
    <RadixTheme>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </RadixTheme>
  </I18nProvider>,
);
