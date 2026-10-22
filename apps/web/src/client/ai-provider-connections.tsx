import type {
  AiAuthMethod,
  AiConnection,
  AiLoginResponse,
  AiLoginState,
  AiProviderOption,
} from "@narumitw/otter-contracts";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiCombobox } from "./ai-combobox.js";
import { ApiResponseError, api } from "./client-support.js";
import { useI18n } from "./i18n.js";

function signInUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function AiProviderConnections({
  authenticationEnabled,
  connections,
  disabled,
  onChange,
  onMutationChange,
  providers,
}: {
  authenticationEnabled: boolean;
  connections: AiConnection[];
  disabled: boolean;
  onChange: () => Promise<void>;
  onMutationChange: (active: boolean) => void;
  providers: AiProviderOption[];
}) {
  const { messages } = useI18n();
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState<AiAuthMethod>("oauth");
  const [provider, setProvider] = useState("");
  const [login, setLogin] = useState<AiLoginState | null>(null);
  const [value, setValue] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const currentLogin = useRef<AiLoginState | null>(null);
  const mounted = useRef(true);
  const acting = useRef(false);
  const generation = useRef(0);
  const candidates = providers.filter((option) =>
    option.authMethods.includes(method),
  );
  const loginId = login?.id;
  const loginStatus = login?.status;
  const pending = loginStatus === "pending";
  const events = [
    ...new Map(
      login?.events.map((event) => [JSON.stringify(event), event]),
    ).values(),
  ];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onMutationChange(false);
      const active = currentLogin.current;
      if (active?.status === "pending") {
        void api(`/api/auth/ai/logins/${active.id}`, {
          method: "DELETE",
        }).catch(() => {});
      }
    };
  }, [onMutationChange]);

  function updateLogin(next: AiLoginState | null) {
    generation.current += 1;
    currentLogin.current = next;
    setLogin(next);
    setValue("");
  }

  useEffect(() => {
    if (disabled || loginStatus !== "pending" || !loginId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const version = generation.current;
      try {
        const response = await api<AiLoginResponse>(
          `/api/auth/ai/logins/${loginId}`,
          {
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        if (version !== generation.current || acting.current) {
          timer = setTimeout(() => void poll(), 1000);
          return;
        }
        const next = response.login;
        if (next.status === "complete") {
          await onChange();
          if (controller.signal.aborted || version !== generation.current)
            return;
          setStatus(messages.aiConnectionSaved);
          setAdding(false);
          setError("");
          onMutationChange(false);
        } else if (next.status === "error") {
          setError(messages.aiAuthError);
          onMutationChange(false);
        } else {
          timer = setTimeout(() => void poll(), 1000);
        }
        // Polling must not erase a response the user is typing.
        if (next.prompt?.id !== currentLogin.current?.prompt?.id) setValue("");
        currentLogin.current = next;
        setLogin(next);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(messages.aiAuthError);
        if (
          caught instanceof ApiResponseError &&
          (caught.status === 401 || caught.status === 404)
        ) {
          if (caught.status === 401) setError(messages.signInFirst);
          const current = currentLogin.current;
          if (current) {
            currentLogin.current = {
              ...current,
              status: "error",
              events: [],
              prompt: undefined,
            };
            setLogin(currentLogin.current);
            setValue("");
          }
          onMutationChange(false);
          return;
        }
        // Keep the cancel action available until the pending login is removed.
        timer = setTimeout(() => void poll(), 3000);
      }
    }
    timer = setTimeout(() => void poll(), 500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    disabled,
    loginId,
    loginStatus,
    messages.aiAuthError,
    messages.aiConnectionSaved,
    messages.signInFirst,
    onChange,
    onMutationChange,
  ]);

  async function connect() {
    if (acting.current || disabled || !provider) return;
    acting.current = true;
    setWorking(true);
    setError("");
    setStatus("");
    onMutationChange(true);
    try {
      const response = await api<AiLoginResponse>("/api/auth/ai/logins", {
        method: "POST",
        body: JSON.stringify({ provider, method }),
      });
      if (!mounted.current) {
        await api(`/api/auth/ai/logins/${response.login.id}`, {
          method: "DELETE",
        });
        return;
      }
      updateLogin(response.login);
      if (response.login.status === "complete") {
        await onChange();
        setStatus(messages.aiConnectionSaved);
        setAdding(false);
        onMutationChange(false);
      } else if (response.login.status === "error") {
        setError(messages.aiAuthError);
        onMutationChange(false);
      }
    } catch {
      if (mounted.current) {
        setError(messages.aiAuthError);
        onMutationChange(false);
      }
    } finally {
      acting.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  async function respond() {
    if (acting.current || disabled || !login?.prompt || !value.trim()) return;
    acting.current = true;
    generation.current += 1;
    setWorking(true);
    setError("");
    const responseValue = value;
    setValue("");
    try {
      const response = await api<AiLoginResponse>(
        `/api/auth/ai/logins/${login.id}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            promptId: login.prompt.id,
            value: responseValue,
          }),
        },
      );
      updateLogin(response.login);
      if (response.login.status === "complete") {
        try {
          await onChange();
          setAdding(false);
          setStatus(messages.aiConnectionSaved);
        } finally {
          onMutationChange(false);
        }
      } else if (response.login.status === "error") {
        setError(messages.aiAuthError);
        onMutationChange(false);
      }
    } catch {
      setError(messages.aiAuthError);
    } finally {
      acting.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  async function cancel() {
    if (acting.current) return;
    acting.current = true;
    generation.current += 1;
    setWorking(true);
    setValue("");
    try {
      let refresh = Boolean(login);
      let sessionExpired = false;
      if (login) {
        try {
          await api(`/api/auth/ai/logins/${login.id}`, { method: "DELETE" });
        } catch (caught) {
          if (
            !(
              caught instanceof ApiResponseError &&
              (caught.status === 401 || caught.status === 404)
            )
          )
            throw caught;
          if (caught.status === 401) {
            refresh = false;
            sessionExpired = true;
          }
        }
      }
      updateLogin(null);
      setAdding(false);
      setError(sessionExpired ? messages.signInFirst : "");
      onMutationChange(false);
      // A credential may have committed just before cancellation reached the API.
      if (refresh) await onChange();
    } catch {
      setError(messages.aiAuthError);
    } finally {
      acting.current = false;
      setWorking(false);
    }
  }

  async function disconnect(id: string) {
    if (acting.current || disabled || pending) return;
    acting.current = true;
    setWorking(true);
    setError("");
    setStatus("");
    onMutationChange(true);
    try {
      await api(`/api/auth/ai/connections/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await onChange();
      setStatus(messages.aiProviderDisconnected);
    } catch {
      setError(messages.aiDisconnectError);
    } finally {
      acting.current = false;
      setWorking(false);
      onMutationChange(false);
    }
  }

  return (
    <section
      className="ai-connections"
      aria-labelledby="ai-connections-heading"
    >
      <h4 id="ai-connections-heading">{messages.aiConnections}</h4>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {status ? <p role="status">{status}</p> : null}
      {connections.length ? (
        <ul className="ai-connection-list">
          {connections.map((connection) => (
            <li key={connection.provider}>
              <div>
                <strong id={`ai-connection-${connection.provider}`}>
                  {providers.find((option) => option.id === connection.provider)
                    ?.name ?? connection.provider}
                </strong>
                <small>
                  {connection.method === "oauth"
                    ? messages.aiSignInAccount
                    : messages.aiSignInApiKey}
                </small>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || working || pending}
                aria-describedby={`ai-connection-${connection.provider}`}
                onClick={() => void disconnect(connection.provider)}
              >
                {messages.aiDisconnect}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p>{messages.aiNoConnections}</p>
      )}
      {!authenticationEnabled ? <p>{messages.aiAuthUnavailable}</p> : null}
      {!adding ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || working || !authenticationEnabled}
          onClick={() => {
            setAdding(true);
            updateLogin(null);
            setError("");
            setStatus("");
          }}
        >
          {messages.aiAddProvider}
        </Button>
      ) : (
        <div className="ai-connection-setup">
          <label htmlFor="ai-auth-method">{messages.aiAuthMethod}</label>
          <select
            id="ai-auth-method"
            className="form-control"
            value={method}
            disabled={disabled || working || pending}
            onChange={(event) => {
              if (
                event.target.value === "oauth" ||
                event.target.value === "api_key"
              ) {
                setMethod(event.target.value);
                setProvider("");
                updateLogin(null);
                setError("");
              }
            }}
          >
            <option value="oauth">{messages.aiSignInAccount}</option>
            <option value="api_key">{messages.aiSignInApiKey}</option>
          </select>
          <AiCombobox
            id="ai-connect-provider"
            label={messages.aiProvider}
            options={candidates}
            value={provider}
            onChange={(next) => {
              setProvider(next);
              updateLogin(null);
              setError("");
            }}
            disabled={disabled || working || pending}
            placeholder={messages.aiProviderPlaceholder}
            noResults={messages.aiNoResults}
          />
          {method === "api_key" ? <p>{messages.aiKeyNotice}</p> : null}
          {pending && login ? (
            <div className="ai-login-progress" aria-busy={working}>
              <p role="status">{messages.aiAuthenticating}</p>
              {method === "oauth" ? <p>{messages.aiAuthWaiting}</p> : null}
              {events.map((event) => {
                const url =
                  event.type === "auth_url"
                    ? signInUrl(event.url)
                    : event.type === "device_code"
                      ? signInUrl(event.verificationUri)
                      : undefined;
                return (
                  <div key={JSON.stringify(event)}>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                      >
                        {messages.aiOpenSignIn}
                      </a>
                    ) : null}
                    {event.type === "device_code" ? (
                      <p>
                        <code>{event.userCode}</code>
                      </p>
                    ) : null}
                    {event.type === "info" || event.type === "progress" ? (
                      <p>{event.message}</p>
                    ) : null}
                    {event.type === "auth_url" && event.instructions ? (
                      <p>{event.instructions}</p>
                    ) : null}
                    {event.type === "info"
                      ? event.links?.map((link) => {
                          const href = signInUrl(link.url);
                          return href ? (
                            <p key={href}>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                              >
                                {link.label ?? href}
                              </a>
                            </p>
                          ) : null;
                        })
                      : null}
                  </div>
                );
              })}
              {login.prompt ? (
                <div className="ai-auth-prompt">
                  <label htmlFor="ai-auth-response">
                    {messages.aiAuthInput}
                  </label>
                  <p id="ai-auth-prompt-help">{login.prompt.message}</p>
                  {login.prompt.type === "select" ? (
                    <select
                      id="ai-auth-response"
                      className="form-control"
                      aria-describedby="ai-auth-prompt-help"
                      value={value}
                      disabled={disabled || working}
                      onChange={(event) => setValue(event.target.value)}
                    >
                      <option value="">—</option>
                      {login.prompt.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="ai-auth-response"
                      aria-describedby="ai-auth-prompt-help"
                      type={login.prompt.type === "text" ? "text" : "password"}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={login.prompt.placeholder}
                      value={value}
                      disabled={disabled || working}
                      onChange={(event) => setValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void respond();
                        }
                      }}
                    />
                  )}
                  <Button
                    type="button"
                    disabled={disabled || working || !value.trim()}
                    onClick={() => void respond()}
                  >
                    {messages.aiAuthContinue}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              disabled={
                disabled ||
                working ||
                !candidates.some((option) => option.id === provider)
              }
              onClick={() => void connect()}
            >
              {messages.aiConnect}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={working}
            onClick={() => void cancel()}
          >
            {messages.aiAuthCancel}
          </Button>
        </div>
      )}
    </section>
  );
}
