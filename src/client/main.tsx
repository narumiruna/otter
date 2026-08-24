import "@radix-ui/themes/styles.css";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { AppShell } from "./app-shell.js";
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
  <RadixTheme>
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  </RadixTheme>,
);
