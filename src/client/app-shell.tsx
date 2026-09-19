import {
  ExitIcon as LogOut,
  GlobeIcon as WifiOff,
} from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountUsernameDialog } from "./account-username-dialog.js";
import { type AppBootstrap, fetchAppBootstrap } from "./app-bootstrap.js";
import {
  AuthScreen,
  type LoginCredentials,
  type RegisterCredentials,
} from "./auth-screen.js";
import { api, type TripPayload, type User } from "./client-support.js";
import { useI18n } from "./i18n.js";
import { AuthenticatedWorkspace } from "./workspace/authenticated-workspace.js";
import { ReadonlyWorkspace } from "./workspace/readonly-workspace.js";

function updateCollaboratorUsername(
  payload: TripPayload | null,
  user: User,
): TripPayload | null {
  if (!payload?.collaborators) return payload;
  return {
    ...payload,
    collaborators: payload.collaborators.map((collaborator) =>
      collaborator.userId === user.id
        ? { ...collaborator, username: user.username }
        : collaborator,
    ),
  };
}

function LoadingScreen() {
  const { messages } = useI18n();
  return (
    <section
      className="grid gap-4 lg:grid-cols-[18rem_1fr]"
      aria-label={messages.loading}
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
  const { locale, setLocale, messages } = useI18n();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [lastBootstrap, setLastBootstrap] = useState<AppBootstrap | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [authAction, setAuthAction] = useState("");
  const [authError, setAuthError] = useState<{
    login?: string;
    register?: string;
  }>({});
  const bootstrapQueryKey = [
    "app-bootstrap",
    window.location.pathname,
    window.location.search,
  ] as const;
  const bootstrap = useQuery({
    queryFn: () =>
      fetchAppBootstrap(window.location.pathname, window.location.search),
    queryKey: bootstrapQueryKey,
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
      announce(
        target === "login" ? messages.signedIn : messages.accountCreated,
      );
    } catch (error) {
      setAuthError({
        [target]:
          error instanceof Error
            ? error.message
            : messages.unableToAuthenticate,
      });
    } finally {
      setAuthAction("");
    }
  }

  async function updateUsername(username: string) {
    const response = await api<{ user: User }>("/api/me", {
      body: JSON.stringify({ username }),
      method: "PATCH",
    });
    const updateBootstrap = (current: AppBootstrap | undefined) =>
      current
        ? {
            ...current,
            selected: updateCollaboratorUsername(
              current.selected,
              response.user,
            ),
            user: response.user,
          }
        : current;
    queryClient.setQueryData<AppBootstrap>(bootstrapQueryKey, updateBootstrap);
    setLastBootstrap(
      (current) => updateBootstrap(current ?? undefined) ?? null,
    );
    queryClient.setQueriesData<TripPayload>(
      { queryKey: ["trip"] },
      (current) =>
        updateCollaboratorUsername(current ?? null, response.user) ?? undefined,
    );
    announce(messages.usernameUpdated);
  }

  async function logout() {
    setAuthAction("logout");
    try {
      await api<{ ok: true }>("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      window.history.replaceState({}, "", "/");
      await bootstrap.refetch();
      announce(messages.signedOut);
    } catch (error) {
      announce(
        messages.signOutFailedMessage({
          message:
            error instanceof Error
              ? error.message
              : messages.pleaseTryAgainLater,
        }),
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
        <h2>{messages.unableToLoadOtter}</h2>
        <p>
          {bootstrap.error instanceof Error
            ? bootstrap.error.message
            : messages.loadingFailed}
        </p>
        <Button onClick={() => void bootstrap.refetch()}>
          {messages.reload}
        </Button>
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
        {messages.skipToMainContent}
      </a>
      <div className="app-shell">
        <header className="app-header">
          <a
            className="brand-row no-underline"
            href="/"
            aria-label={messages.otterHome}
          >
            <img
              className="brand-mark"
              src="/icon.svg"
              alt=""
              width={44}
              height={44}
            />
            <span>
              <h1 className="brand-name">otter</h1>
              <span className="brand-tagline">
                {messages.travelTogetherSplitExpensesEasily}
              </span>
            </span>
          </a>
          <div className="user-menu">
            <label className="language-picker">
              <span className="sr-only">{messages.language}</span>
              <select
                aria-label={messages.language}
                value={locale}
                onChange={(event) => {
                  setAuthError({});
                  setLocale(event.target.value as "en" | "zh-TW");
                }}
              >
                <option value="en">{messages.english}</option>
                <option value="zh-TW">{messages.traditionalChinese}</option>
              </select>
            </label>
            {appData?.user ? (
              <>
                <AccountUsernameDialog
                  offline={offline}
                  onUpdate={updateUsername}
                  user={appData.user}
                />
                <Button
                  aria-label={messages.signOutName({ name: appData.user.name })}
                  disabled={offline || authAction === "logout"}
                  onClick={() => void logout()}
                  variant="outline"
                >
                  <LogOut aria-hidden="true" />
                  <span className="desktop-only">
                    {authAction === "logout"
                      ? messages.signingOut
                      : messages.signOut}
                  </span>
                </Button>
              </>
            ) : (
              <span className="header-note">
                {messages.goodFriendsSplitExpensesWell}
              </span>
            )}
          </div>
        </header>
        {offline ? (
          <div className="offline-banner" role="status">
            <WifiOff aria-hidden="true" />
            {
              messages.youAreOfflineLoadedDataIsAvailableButEditingRequiresAConnection
            }
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
