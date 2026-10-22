import type {
  AiCatalogResponse,
  AiConnectionsResponse,
  AiSettingsResponse,
  AiThinkingLevel,
  AiSettings as Settings,
} from "@narumitw/otter-contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AiCombobox } from "./ai-combobox.js";
import { AiProviderConnections } from "./ai-provider-connections.js";
import { api } from "./client-support.js";
import { useI18n } from "./i18n.js";

const emptySettings: Settings = {
  provider: "",
  model: "",
  thinkingLevel: "off",
};

export function AiSettings({
  disabled,
  offline,
  onMutationChange,
}: {
  disabled: boolean;
  offline: boolean;
  onMutationChange: (active: boolean) => void;
}) {
  const { messages } = useI18n();
  const [catalog, setCatalog] = useState<AiCatalogResponse | null>(null);
  const [connections, setConnections] = useState<
    AiConnectionsResponse["connections"]
  >([]);
  const [draft, setDraft] = useState<Settings>(emptySettings);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [status, setStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authActive, setAuthActive] = useState(false);
  const loadController = useRef<AbortController | null>(null);
  const mutation = useRef(false);

  const load = useCallback(() => {
    loadController.current?.abort();
    if (offline) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadFailed(false);
    void Promise.all([
      api<AiCatalogResponse>("/api/auth/ai/catalog", {
        signal: controller.signal,
      }),
      api<AiSettingsResponse>("/api/auth/ai/settings", {
        signal: controller.signal,
      }),
      api<AiConnectionsResponse>("/api/auth/ai/connections", {
        signal: controller.signal,
      }),
    ])
      .then(([options, preferences, linked]) => {
        if (controller.signal.aborted) return;
        if (
          !Array.isArray(options.providers) ||
          !Array.isArray(linked.connections)
        )
          throw new Error("Invalid AI settings response");
        setCatalog(options);
        setConnections(linked.connections);
        setSaved(preferences.settings);
        setDraft(preferences.settings ?? emptySettings);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [offline]);

  useEffect(() => {
    load();
    return () => loadController.current?.abort();
  }, [load]);

  const reloadConnections = useCallback(async () => {
    const linked = await api<AiConnectionsResponse>("/api/auth/ai/connections");
    setConnections(linked.connections);
    const hasProvider = (id: string) =>
      linked.connections.some((connection) => connection.provider === id);
    setDraft((current) =>
      !current.provider || hasProvider(current.provider)
        ? current
        : emptySettings,
    );
    setSaved((current) =>
      current && hasProvider(current.provider) ? current : null,
    );
    setStatus(false);
  }, []);

  const changeAuthMutation = useCallback(
    (active: boolean) => {
      setAuthActive(active);
      onMutationChange(active);
    },
    [onMutationChange],
  );

  const providers =
    catalog?.providers.filter((provider) =>
      connections.some((connection) => connection.provider === provider.id),
    ) ?? [];
  const provider = providers.find((option) => option.id === draft.provider);
  const model = provider?.models.find((option) => option.id === draft.model);
  const valid = model?.thinkingLevels.includes(draft.thinkingLevel) === true;
  const unchanged =
    saved?.provider === draft.provider &&
    saved?.model === draft.model &&
    saved?.thinkingLevel === draft.thinkingLevel;
  const controlsDisabled =
    disabled || offline || saving || authActive || loading || loadFailed;

  function changeDraft(next: Settings) {
    setDraft(next);
    setSaveFailed(false);
    setStatus(false);
  }

  async function save() {
    if (mutation.current || controlsDisabled || !valid || unchanged) return;
    mutation.current = true;
    setSaving(true);
    setSaveFailed(false);
    setStatus(false);
    onMutationChange(true);
    try {
      const response = await api<AiSettingsResponse>("/api/auth/ai/settings", {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setSaved(response.settings);
      setStatus(true);
    } catch {
      setSaveFailed(true);
    } finally {
      mutation.current = false;
      setSaving(false);
      onMutationChange(false);
    }
  }

  return (
    <section
      id="account-ai"
      className="surface account-settings-section"
      aria-labelledby="ai-settings-heading"
    >
      <div className="account-settings-section-heading">
        <h3 id="ai-settings-heading">{messages.aiSettings}</h3>
        <p>{messages.aiSettingsDescription}</p>
      </div>
      {loading ? <p role="status">{messages.aiLoading}</p> : null}
      {loadFailed ? (
        <div>
          <p role="alert" className="error">
            {messages.aiLoadError}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={offline || disabled}
            onClick={load}
          >
            {messages.reload}
          </Button>
        </div>
      ) : null}
      {!loading && !loadFailed && catalog ? (
        <AiProviderConnections
          authenticationEnabled={catalog.authenticationEnabled}
          connections={connections}
          disabled={disabled || offline || saving}
          onChange={reloadConnections}
          onMutationChange={changeAuthMutation}
          providers={catalog.providers}
        />
      ) : null}
      <div className="ai-model-settings">
        {!connections.length ? (
          <p>{messages.aiSelectConnectedProvider}</p>
        ) : null}
        {saved && (!provider || !model) ? (
          <p role="status">{messages.aiUnavailableSelection}</p>
        ) : null}
        <AiCombobox
          id="ai-provider"
          label={messages.aiProvider}
          options={providers}
          value={draft.provider}
          onChange={(next) =>
            changeDraft({ provider: next, model: "", thinkingLevel: "off" })
          }
          disabled={controlsDisabled || providers.length === 0}
          placeholder={messages.aiProviderPlaceholder}
          noResults={messages.aiNoResults}
        />
        <AiCombobox
          id="ai-model"
          label={messages.aiModel}
          options={provider?.models ?? []}
          value={draft.model}
          onChange={(next) => {
            const levels =
              provider?.models.find((option) => option.id === next)
                ?.thinkingLevels ?? [];
            const thinkingLevel = levels.includes(draft.thinkingLevel)
              ? draft.thinkingLevel
              : (levels[0] ?? "off");
            changeDraft({ ...draft, model: next, thinkingLevel });
          }}
          disabled={controlsDisabled || !provider}
          placeholder={messages.aiModelPlaceholder}
          noResults={messages.aiNoResults}
        />
        <div className="ai-thinking-field">
          <label htmlFor="ai-thinking-level">{messages.aiThinkingLevel}</label>
          <select
            id="ai-thinking-level"
            className="form-control"
            value={model ? draft.thinkingLevel : ""}
            disabled={controlsDisabled || !model}
            onChange={(event) => {
              const thinkingLevel: AiThinkingLevel | undefined =
                model?.thinkingLevels.find(
                  (level) => level === event.target.value,
                );
              if (thinkingLevel) changeDraft({ ...draft, thinkingLevel });
            }}
          >
            {!model ? <option value="">—</option> : null}
            {model?.thinkingLevels.map((level) => (
              <option key={level} value={level}>
                {level === "off" ? messages.aiThinkingOff : level}
              </option>
            ))}
          </select>
        </div>
      </div>
      {saveFailed ? (
        <p role="alert" className="error">
          {messages.aiSaveError}
        </p>
      ) : null}
      {status ? <p role="status">{messages.aiSaved}</p> : null}
      <div className="account-settings-actions">
        <Button
          type="button"
          disabled={controlsDisabled || !valid || unchanged}
          onClick={() => void save()}
        >
          {saving ? messages.saving : messages.aiSave}
        </Button>
      </div>
    </section>
  );
}
