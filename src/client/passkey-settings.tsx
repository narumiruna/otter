import {
  CheckCircledIcon,
  IdCardIcon as KeyIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "./client-support.js";
import { useI18n } from "./i18n.js";
import {
  type PasskeySummary,
  registerPasskey,
  supportsPasskeys,
} from "./passkeys.js";

export function PasskeySettings({ offline }: { offline: boolean }) {
  const { locale, messages } = useI18n();
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const supported = supportsPasskeys();

  const loadPasskeys = useCallback(async () => {
    try {
      const result = await api<{ passkeys: PasskeySummary[] }>("/api/passkeys");
      setPasskeys(result.passkeys);
      setError("");
    } catch {
      setError(messages.unableToLoadPasskeys);
    }
  }, [messages.unableToLoadPasskeys]);

  useEffect(() => {
    if (offline) return;
    void loadPasskeys();
  }, [offline, loadPasskeys]);

  async function addPasskey() {
    setBusy("add");
    setError("");
    setStatus("");
    try {
      await registerPasskey();
      await loadPasskeys();
      setStatus(messages.passkeyAdded);
    } catch {
      setError(messages.unableToAddPasskey);
    } finally {
      setBusy("");
    }
  }

  async function removePasskey(passkey: PasskeySummary) {
    setBusy(passkey.id);
    setError("");
    setStatus("");
    try {
      await api<{ ok: true }>(
        `/api/passkeys/${encodeURIComponent(passkey.id)}`,
        { method: "DELETE" },
      );
      setPasskeys((current) =>
        current.filter((candidate) => candidate.id !== passkey.id),
      );
      setStatus(messages.passkeyRemoved);
    } catch {
      setError(messages.unableToRemovePasskey);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="passkey-settings" aria-labelledby="passkey-heading">
      <div>
        <h3 id="passkey-heading">
          <KeyIcon aria-hidden="true" /> {messages.passkeys}
        </h3>
        <p className="passkey-description">
          {messages.useAPasskeyToSignInWithoutYourPassword}
        </p>
      </div>
      {error ? (
        <p className="passkey-message error-text" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="passkey-message" role="status">
          <CheckCircledIcon aria-hidden="true" /> {status}
        </p>
      ) : null}
      {passkeys.length > 0 ? (
        <ul className="passkey-list">
          {passkeys.map((passkey, index) => (
            <li key={passkey.id}>
              <span>
                <strong>{messages.passkeyNumber({ number: index + 1 })}</strong>
                <small>
                  {messages.addedOnDate({
                    date: new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(passkey.createdAt)),
                  })}
                </small>
              </span>
              <Button
                aria-label={messages.removePasskeyNumber({
                  number: index + 1,
                })}
                disabled={offline || Boolean(busy)}
                onClick={() => void removePasskey(passkey)}
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
        <p className="passkey-empty">{messages.noPasskeysAdded}</p>
      )}
      {supported ? (
        <Button
          disabled={offline || Boolean(busy)}
          onClick={() => void addPasskey()}
          type="button"
          variant="outline"
        >
          <KeyIcon aria-hidden="true" />
          {busy === "add" ? messages.addingPasskey : messages.addPasskey}
        </Button>
      ) : (
        <p className="passkey-empty">
          {messages.thisBrowserDoesNotSupportPasskeys}
        </p>
      )}
    </section>
  );
}
