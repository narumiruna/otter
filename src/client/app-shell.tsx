import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, WifiOff } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type AppBootstrap, fetchAppBootstrap } from "./app-bootstrap.js";
import {
  AuthScreen,
  type LoginCredentials,
  type RegisterCredentials,
} from "./auth-screen.js";
import { api, type User } from "./client-support.js";
import { AuthenticatedWorkspace } from "./workspace/authenticated-workspace.js";
import { ReadonlyWorkspace } from "./workspace/readonly-workspace.js";

function LoadingScreen() {
  return (
    <section
      className="grid gap-4 lg:grid-cols-[18rem_1fr]"
      aria-label="載入中"
    >
      <Skeleton className="h-72 rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </section>
  );
}

export function AppShell() {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [lastBootstrap, setLastBootstrap] = useState<AppBootstrap | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [authAction, setAuthAction] = useState("");
  const [authError, setAuthError] = useState<{
    login?: string;
    register?: string;
  }>({});
  const bootstrap = useQuery({
    queryFn: () =>
      fetchAppBootstrap(window.location.pathname, window.location.search),
    queryKey: [
      "app-bootstrap",
      window.location.pathname,
      window.location.search,
    ],
    refetchOnWindowFocus: false,
    retry: false,
  });

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  useEffect(() => {
    if (bootstrap.data) setLastBootstrap(bootstrap.data);
  }, [bootstrap.data]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(""), 4_500);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  async function completeAuth(
    path: "/api/auth/login" | "/api/auth/register",
    credentials: LoginCredentials | RegisterCredentials,
  ) {
    const target = path.endsWith("login") ? "login" : "register";
    setAuthAction(target);
    setAuthError({});
    try {
      await api<{ user: User }>(path, {
        body: JSON.stringify(credentials),
        method: "POST",
      });
      queryClient.clear();
      await bootstrap.refetch();
      announce(target === "login" ? "登入成功" : "帳號建立成功");
    } catch (error) {
      setAuthError({
        [target]: error instanceof Error ? error.message : "無法完成驗證",
      });
    } finally {
      setAuthAction("");
    }
  }

  async function logout() {
    setAuthAction("logout");
    try {
      await api<{ ok: true }>("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      window.history.replaceState({}, "", "/");
      await bootstrap.refetch();
      announce("已登出");
    } catch (error) {
      announce(
        `登出失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
      );
    } finally {
      setAuthAction("");
    }
  }

  const appData = bootstrap.data ?? lastBootstrap;
  let body: ReactNode;
  if (bootstrap.isPending && !appData) body = <LoadingScreen />;
  else if (bootstrap.isError && !appData) {
    body = (
      <section className="surface empty-state">
        <h2>目前無法載入 otter</h2>
        <p>
          {bootstrap.error instanceof Error
            ? bootstrap.error.message
            : "載入失敗"}
        </p>
        <Button onClick={() => void bootstrap.refetch()}>重新載入</Button>
      </section>
    );
  } else if (appData?.readonlyShare && appData.selected) {
    body = <ReadonlyWorkspace payload={appData.selected} />;
  } else if (appData?.user) {
    body = (
      <AuthenticatedWorkspace
        announce={announce}
        bootstrap={appData}
        offline={offline}
      />
    );
  } else {
    body = (
      <AuthScreen
        busyAction={authAction}
        devLoginCredentials={appData?.devLoginCredentials}
        loginError={authError.login}
        onLogin={(credentials) => completeAuth("/api/auth/login", credentials)}
        onRegister={(credentials) =>
          completeAuth("/api/auth/register", credentials)
        }
        registerError={authError.register}
      />
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要內容
      </a>
      <div className="app-shell">
        <header className="app-header">
          <a
            className="brand-row no-underline"
            href="/"
            aria-label="otter 首頁"
          >
            <span className="brand-mark" aria-hidden="true" />
            <span>
              <h1 className="brand-name">otter</h1>
              <span className="brand-tagline">旅行和聚會的清楚拆帳</span>
            </span>
          </a>
          {appData?.user ? (
            <div className="user-menu">
              <span className="user-avatar" aria-hidden="true">
                {appData.user.name.trim().charAt(0).toLocaleUpperCase() || "O"}
              </span>
              <span className="user-identity">
                <strong>{appData.user.name}</strong>
                <small>{appData.user.email}</small>
              </span>
              <Button
                aria-label={`登出 ${appData.user.name}`}
                disabled={offline || authAction === "logout"}
                onClick={() => void logout()}
                variant="outline"
              >
                <LogOut aria-hidden="true" />
                <span className="desktop-only">
                  {authAction === "logout" ? "登出中…" : "登出"}
                </span>
              </Button>
            </div>
          ) : null}
        </header>
        {offline ? (
          <div className="offline-banner" role="status">
            <WifiOff aria-hidden="true" />
            目前離線；可以查看已載入資料，修改功能需恢復連線。
          </div>
        ) : null}
        {announcement ? (
          <p
            className="status-toast"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </p>
        ) : null}
        <main id="main-content" tabIndex={-1}>
          {body}
        </main>
      </div>
    </>
  );
}
