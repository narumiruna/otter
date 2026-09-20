import type {
  ApiToken,
  ApiTokensResponse,
  CreateApiTokenResponse,
} from "@narumitw/otter-contracts";
import {
  CheckCircledIcon,
  ClipboardCopyIcon,
  IdCardIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "./client-support.js";
import { useI18n } from "./i18n.js";

export function ApiTokenSettings({
  offline,
  onMutationChange = () => undefined,
}: {
  offline: boolean;
  onMutationChange?: (active: boolean) => void;
}) {
  const { locale, messages } = useI18n();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState("");
  const [createdToken, setCreatedToken] =
    useState<CreateApiTokenResponse | null>(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(!offline);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [status, setStatus] = useState("");
  const listAbortController = useRef<AbortController | undefined>(undefined);
  const listGeneration = useRef(0);
  const mutationActive = useRef(false);
  const error = actionError || listError;

  const loadTokens = useCallback(async () => {
    if (mutationActive.current) return;
    listAbortController.current?.abort();
    const controller = new AbortController();
    listAbortController.current = controller;
    const generation = ++listGeneration.current;
    try {
      const result = await api<ApiTokensResponse>("/api/auth/tokens", {
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        mutationActive.current ||
        generation !== listGeneration.current
      ) {
        return;
      }
      setTokens(result.tokens);
      setListError("");
    } catch {
      if (
        !controller.signal.aborted &&
        !mutationActive.current &&
        generation === listGeneration.current
      ) {
        setListError(messages.unableToLoadApiTokens);
      }
    } finally {
      if (listAbortController.current === controller) {
        listAbortController.current = undefined;
      }
    }
  }, [messages.unableToLoadApiTokens]);

  useEffect(() => {
    if (offline) {
      listAbortController.current?.abort();
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadTokens().finally(() => {
      if (!mutationActive.current) setLoading(false);
    });
    return () => listAbortController.current?.abort();
  }, [loadTokens, offline]);

  function beginMutation() {
    mutationActive.current = true;
    onMutationChange(true);
    listGeneration.current += 1;
    listAbortController.current?.abort();
    setLoading(false);
  }

  function endMutation() {
    mutationActive.current = false;
    onMutationChange(false);
    listGeneration.current += 1;
    setLoading(false);
  }

  async function createToken() {
    const tokenName = name.trim();
    if (!tokenName) {
      setActionError(messages.enterATokenName);
      return;
    }

    setBusy("create");
    beginMutation();
    setActionError("");
    setListError("");
    setStatus("");
    try {
      const result = await api<CreateApiTokenResponse>("/api/auth/tokens", {
        body: JSON.stringify({ name: tokenName }),
        method: "POST",
      });
      setTokens((current) => [
        result.token,
        ...current.filter((token) => token.id !== result.token.id),
      ]);
      setCreatedToken(result);
      setName("");
    } catch {
      setActionError(messages.unableToCreateApiToken);
    } finally {
      endMutation();
      setBusy("");
    }
  }

  async function revokeToken(token: ApiToken) {
    setBusy(token.id);
    beginMutation();
    setActionError("");
    setListError("");
    setStatus("");
    let failed = false;
    try {
      await api<{ ok: true }>(
        `/api/auth/tokens/${encodeURIComponent(token.id)}`,
        { method: "DELETE" },
      );
      setTokens((current) =>
        current.filter((candidate) => candidate.id !== token.id),
      );
      setCreatedToken((current) =>
        current?.token.id === token.id ? null : current,
      );
      setStatus(messages.apiTokenRevoked);
    } catch {
      failed = true;
    } finally {
      endMutation();
    }

    if (failed) {
      await loadTokens();
      setActionError(messages.unableToRevokeApiToken);
    }
    setBusy("");
  }

  async function copyToken() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken.accessToken);
      setStatus(messages.apiTokenCopied);
      setActionError("");
    } catch {
      setActionError(messages.unableToCopyApiToken);
    }
  }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(value),
    );

  return (
    <section className="api-token-settings" aria-labelledby="api-token-heading">
      <div>
        <h3 id="api-token-heading">
          <IdCardIcon aria-hidden="true" /> {messages.apiTokens}
        </h3>
        <p className="api-token-description">
          {messages.useApiTokensWithTheOtterCli}
        </p>
      </div>
      {error ? (
        <p className="api-token-message error-text" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="api-token-message" role="status">
          <CheckCircledIcon aria-hidden="true" /> {status}
        </p>
      ) : null}
      {createdToken ? (
        <section aria-label={messages.newApiToken} className="api-token-secret">
          <strong>{messages.copyYourApiTokenNow}</strong>
          <p>{messages.apiTokenShownOnce}</p>
          <code>{createdToken.accessToken}</code>
          <div className="api-token-secret-actions">
            <Button
              disabled={offline}
              onClick={() => void copyToken()}
              type="button"
              variant="outline"
            >
              <ClipboardCopyIcon aria-hidden="true" />
              {messages.copyToken}
            </Button>
            <Button
              onClick={() => setCreatedToken(null)}
              type="button"
              variant="ghost"
            >
              {messages.done}
            </Button>
          </div>
        </section>
      ) : null}
      {!createdToken ? (
        <div className="api-token-create">
          <Field>
            <FieldLabel htmlFor="api-token-name">
              {messages.tokenName}
            </FieldLabel>
            <Input
              id="api-token-name"
              autoComplete="off"
              disabled={offline || loading || Boolean(busy)}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void createToken();
              }}
              placeholder={messages.tokenNameExample}
              value={name}
            />
          </Field>
          <Button
            disabled={offline || loading || Boolean(busy)}
            onClick={() => void createToken()}
            type="button"
            variant="outline"
          >
            <IdCardIcon aria-hidden="true" />
            {busy === "create"
              ? messages.creatingApiToken
              : messages.createApiToken}
          </Button>
        </div>
      ) : null}
      {tokens.length > 0 ? (
        <ul className="api-token-list">
          {tokens.map((token) => (
            <li key={token.id}>
              <span>
                <strong>{token.name}</strong>
                <small>
                  {messages.apiTokenDates({
                    created: formatDate(token.createdAt),
                    expires: formatDate(token.expiresAt),
                  })}
                </small>
              </span>
              <Button
                aria-label={messages.revokeNamedApiToken({ name: token.name })}
                disabled={offline || Boolean(busy)}
                onClick={() => void revokeToken(token)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <TrashIcon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="api-token-empty">
          {loading ? messages.loadingApiTokens : messages.noActiveApiTokens}
        </p>
      )}
      <p className="api-token-help">
        {messages.apiTokensExpireAfter90Days} <code>OTTER_TOKEN</code>.
      </p>
    </section>
  );
}
