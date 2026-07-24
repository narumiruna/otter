import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAppBootstrap } from "./app-bootstrap.js";
import { AuthScreen } from "./auth-screen.js";
import {
  commitLegacyView,
  connectLegacyController,
  login,
  logout,
  register,
  setOffline,
  state,
} from "./legacy-controller.js";
import { dashboardView, readonlyShareView } from "./views.js";

function LegacyView({ html }: { html: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    root.innerHTML = html;
    commitLegacyView();
    return () => {
      root.replaceChildren();
    };
  }, [html]);

  return <div className="contents" ref={rootRef} />;
}

function StatusMessage({
  children,
  kind,
}: {
  children: ReactNode;
  kind: "error" | "notice";
}) {
  const isError = kind === "error";
  return (
    <p
      className={isError ? "error" : "notice"}
      id={isError ? "global-error" : "status-message"}
      role={isError ? "alert" : "status"}
      aria-live={isError ? undefined : "polite"}
      tabIndex={-1}
    >
      {children}
    </p>
  );
}

function LoadingScreen() {
  return (
    <section
      className="grid gap-4 lg:grid-cols-[18rem_1fr]"
      aria-label="載入中"
    >
      <Skeleton className="h-72 rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </section>
  );
}

export function AppShell() {
  const queryClient = useQueryClient();
  const [, rerender] = useReducer((revision: number) => revision + 1, 0);
  const hydratedAt = useRef(0);
  const bootstrap = useQuery({
    queryKey: ["app-bootstrap", window.location.pathname],
    queryFn: () => fetchAppBootstrap(window.location.pathname),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    connectLegacyController(queryClient, rerender);
  }, [queryClient]);

  useEffect(() => {
    const syncConnectivity = () => setOffline(!navigator.onLine);
    window.addEventListener("online", syncConnectivity);
    window.addEventListener("offline", syncConnectivity);
    return () => {
      window.removeEventListener("online", syncConnectivity);
      window.removeEventListener("offline", syncConnectivity);
    };
  }, []);

  useEffect(() => {
    if (!bootstrap.data || hydratedAt.current === bootstrap.dataUpdatedAt) {
      return;
    }
    hydratedAt.current = bootstrap.dataUpdatedAt;
    state.archivedTrips = bootstrap.data.archivedTrips;
    state.readonlyShare = bootstrap.data.readonlyShare;
    state.selected = bootstrap.data.selected;
    state.trips = bootstrap.data.trips;
    state.user = bootstrap.data.user;
    state.activeTab = bootstrap.data.selected ? "add-expense" : "overview";
    state.error = "";
    state.formError = "";
    state.formErrorTarget = "";
    rerender();
  }, [bootstrap.data, bootstrap.dataUpdatedAt]);

  const bootstrapError =
    bootstrap.error instanceof Error ? bootstrap.error.message : "載入失敗";
  const body = (() => {
    if (bootstrap.isPending && !state.user && !state.readonlyShare) {
      return <LoadingScreen />;
    }
    if (bootstrap.isError) {
      return (
        <section className="card empty-state">
          <h2>目前無法載入 otter</h2>
          <p className="muted">{bootstrapError}</p>
          <Button
            className="min-h-11"
            onClick={() => {
              void bootstrap.refetch();
            }}
          >
            重新載入
          </Button>
        </section>
      );
    }
    if (state.readonlyShare && state.selected) {
      return <LegacyView html={readonlyShareView(state.selected)} />;
    }
    if (state.user) {
      return <LegacyView html={dashboardView(state)} />;
    }
    return (
      <AuthScreen
        busyAction={state.pendingAction}
        devLoginCredentials={bootstrap.data?.devLoginCredentials}
        loginError={
          state.formErrorTarget === "login-form" ? state.formError : undefined
        }
        onLogin={login}
        onRegister={register}
        registerError={
          state.formErrorTarget === "register-form"
            ? state.formError
            : undefined
        }
      />
    );
  })();

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要內容
      </a>
      <main
        id="main-content"
        className={`app${state.busy ? " is-busy" : ""}`}
        aria-busy={state.busy}
        tabIndex={-1}
      >
        <section className={`hero${state.user ? " hero-compact" : ""}`}>
          <div className="brand-row">
            <span className="brand-mark" aria-hidden="true" />
            <div>
              <h1>otter</h1>
              <p className="muted">
                {state.user ? "旅行拆帳工作區" : "旅行和朋友聚會的記帳拆帳 app"}
              </p>
            </div>
          </div>
          {state.user ? (
            <div className="row user-menu">
              <span className="user-avatar" aria-hidden="true">
                {state.user.name.trim().charAt(0).toLocaleUpperCase() || "O"}
              </span>
              <span className="user-name">{state.user.name}</span>
              <Button
                className="min-h-11"
                disabled={state.pendingAction === "logout"}
                onClick={() => {
                  void logout();
                }}
                variant="outline"
              >
                {state.pendingAction === "logout" ? "登出中…" : "登出"}
              </Button>
            </div>
          ) : null}
        </section>
        {state.offline ? (
          <StatusMessage kind="notice">
            目前離線，資料需連線後載入。
          </StatusMessage>
        ) : null}
        {state.busy ? (
          <p
            className="notice"
            id="busy-message"
            role="status"
            aria-live="polite"
            tabIndex={-1}
          >
            正在處理…
          </p>
        ) : null}
        {!state.busy && state.message ? (
          <StatusMessage kind="notice">{state.message}</StatusMessage>
        ) : null}
        {state.error ? (
          <StatusMessage kind="error">{state.error}</StatusMessage>
        ) : null}
        {body}
      </main>
    </>
  );
}
