import { GlobeIcon as WifiOff } from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountMenu } from "./account-menu.js";
import { AccountSettingsPage } from "./account-settings-page.js";
import { type AppBootstrap, fetchAppBootstrap } from "./app-bootstrap.js";
import {
  AuthScreen,
  type LoginCredentials,
  type RegisterCredentials,
} from "./auth-screen.js";
import { api, type TripPayload, type User } from "./client-support.js";
import { DeviceAuthorization } from "./device-authorization.js";
import { useI18n } from "./i18n.js";
import { authenticateWithPasskey, supportsPasskeys } from "./passkeys.js";
import {
  isAccountSettingsLocation,
  withoutAccountSettingsLocation,
  writeAccountSettingsLocation,
} from "./url-state.js";
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

const accountSettingsHistoryStateKey = "otterAccountSettings";

function isAccountSettingsHistoryEntry(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    Reflect.get(state, accountSettingsHistoryStateKey) === true
  );
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
  const { locale, messages } = useI18n();
  const previousLocale = useRef(locale);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(() =>
    isAccountSettingsLocation(new URL(window.location.href)),
  );
  const [accountSettingsMutationActive, setAccountSettingsMutationActive] =
    useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const restoreAccountFocus = useRef(accountSettingsOpen);
  const workspaceScrollPosition = useRef<number | null>(null);
  const [lastBootstrap, setLastBootstrap] = useState<AppBootstrap | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [authAction, setAuthAction] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [authError, setAuthError] = useState<{
    login?: string;
    register?: string;
  }>({});

  useEffect(() => {
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    setAuthError({});
  }, [locale]);
  const bootstrapLocation = withoutAccountSettingsLocation(
    new URL(window.location.href),
  );
  const bootstrapQueryKey = [
    "app-bootstrap",
    bootstrapLocation.pathname,
    bootstrapLocation.search,
  ] as const;
  const bootstrap = useQuery({
    queryFn: () =>
      fetchAppBootstrap(bootstrapLocation.pathname, bootstrapLocation.search),
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

  useEffect(() => {
    const sync = () => {
      const current = new URL(window.location.href);
      const nextOpen = isAccountSettingsLocation(current);
      if (accountSettingsMutationActive && !nextOpen) {
        const currentState =
          typeof window.history.state === "object" &&
          window.history.state !== null
            ? window.history.state
            : {};
        window.history.pushState(
          { ...currentState, [accountSettingsHistoryStateKey]: true },
          "",
          writeAccountSettingsLocation(current, true),
        );
        setAccountSettingsOpen(true);
        return;
      }
      setAccountSettingsOpen((currentOpen) => {
        if (nextOpen && !currentOpen) {
          workspaceScrollPosition.current = window.scrollY;
        }
        return nextOpen;
      });
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [accountSettingsMutationActive]);

  useEffect(() => {
    if (!accountSettingsMutationActive) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [accountSettingsMutationActive]);

  useEffect(() => {
    if (accountSettingsOpen) {
      restoreAccountFocus.current = true;
      return;
    }
    if (!restoreAccountFocus.current) return;
    restoreAccountFocus.current = false;
    const scrollPosition = workspaceScrollPosition.current;
    workspaceScrollPosition.current = null;
    const frame = requestAnimationFrame(() => {
      accountButtonRef.current?.focus({ preventScroll: true });
      if (scrollPosition !== null) {
        window.scrollTo({ behavior: "instant", top: scrollPosition });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [accountSettingsOpen]);

  function openAccountSettings() {
    const current = new URL(window.location.href);
    if (isAccountSettingsLocation(current)) return;
    workspaceScrollPosition.current = window.scrollY;
    const currentState =
      typeof window.history.state === "object" && window.history.state !== null
        ? window.history.state
        : {};
    window.history.pushState(
      { ...currentState, [accountSettingsHistoryStateKey]: true },
      "",
      writeAccountSettingsLocation(current, true),
    );
    setAccountSettingsOpen(true);
  }

  function closeAccountSettings() {
    if (accountSettingsMutationActive) return;
    const current = new URL(window.location.href);
    if (
      isAccountSettingsLocation(current) &&
      isAccountSettingsHistoryEntry(window.history.state)
    ) {
      window.history.back();
      return;
    }
    window.history.replaceState(
      window.history.state,
      "",
      writeAccountSettingsLocation(current, false),
    );
    setAccountSettingsOpen(false);
  }

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
      const result = await bootstrap.refetch();
      if (result.data?.user) setSessionEnded(false);
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

  async function completePasskeyLogin() {
    setAuthAction("passkey");
    setAuthError({});
    try {
      await authenticateWithPasskey();
      queryClient.clear();
      const result = await bootstrap.refetch();
      if (result.data?.user) setSessionEnded(false);
      announce(messages.signedIn);
    } catch {
      setAuthError({ login: messages.unableToSignInWithAPasskey });
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
      setSessionEnded(true);
      restoreAccountFocus.current = false;
      setAccountSettingsOpen(false);
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
    const authenticatedBody =
      window.location.pathname === "/device" ? (
        <DeviceAuthorization
          initialCode={
            new URLSearchParams(window.location.search).get("code") ?? ""
          }
        />
      ) : (
        <AuthenticatedWorkspace
          announce={announce}
          bootstrap={appData}
          offline={offline}
          webMcpEnabled={
            !sessionEnded && !accountSettingsOpen && authAction !== "logout"
          }
        />
      );
    body = (
      <>
        {accountSettingsOpen ? (
          <AccountSettingsPage
            offline={offline}
            onClose={closeAccountSettings}
            onMutationChange={setAccountSettingsMutationActive}
            onUpdate={updateUsername}
            user={appData.user}
          />
        ) : null}
        <div hidden={accountSettingsOpen}>{authenticatedBody}</div>
      </>
    );
  } else {
    body = (
      <AuthScreen
        busyAction={authAction}
        devLoginCredentials={appData?.devLoginCredentials}
        loginError={authError.login}
        onLogin={(credentials) => completeAuth("/api/auth/login", credentials)}
        onPasskeyLogin={completePasskeyLogin}
        onRegister={(credentials) =>
          completeAuth("/api/auth/register", credentials)
        }
        passkeySupported={supportsPasskeys()}
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
            onClick={(event) => {
              if (accountSettingsMutationActive) event.preventDefault();
            }}
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
            {appData?.user ? (
              <AccountMenu
                ref={accountButtonRef}
                accountSettingsActive={accountSettingsOpen}
                onOpenAccountSettings={openAccountSettings}
                onSignOut={logout}
                signOutDisabled={
                  offline ||
                  accountSettingsMutationActive ||
                  authAction === "logout"
                }
                signingOut={authAction === "logout"}
                user={appData.user}
              />
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
