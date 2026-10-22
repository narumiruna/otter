import { createHash, randomUUID } from "node:crypto";
import type { AuthPrompt, Credential, Provider } from "@earendil-works/pi-ai";
import type {
  AiAuthEvent,
  AiAuthMethod,
  AiAuthPrompt,
  AiLoginState,
} from "@narumitw/otter-contracts";
import { aiDeviceId } from "./server-ai-credentials.js";
import {
  type AiProviderLogin,
  automaticAiChoice,
  loginAiProvider,
  supportedAiPrompt,
  validAiPromptValue,
} from "./server-ai-providers.js";

const loginTtlMs = 10 * 60_000;
const finishedTtlMs = 60_000;
const globalLimit = 100;
const userLimit = 3;

type PendingPrompt = {
  sdk: AuthPrompt;
  resolve: (value: string) => void;
  reject: () => void;
};
type Login = {
  user: string;
  session: string;
  state: AiLoginState;
  controller: AbortController;
  timer: ReturnType<typeof setTimeout>;
  pending?: PendingPrompt;
  task?: Promise<void>;
};
type SaveCredential = (
  user: string,
  provider: string,
  credential: Credential,
  signal: AbortSignal,
) => Promise<void>;

export function aiBrowserSession(cookie: string): string {
  return createHash("sha256").update(cookie).digest("hex");
}

// All state is process-local, bounded, and owned by both account and session.
export class AiLoginBroker {
  private readonly logins = new Map<string, Login>();

  constructor(
    private readonly key: Buffer,
    private readonly save: SaveCredential,
    private readonly loginProvider: AiProviderLogin = loginAiProvider,
  ) {}

  start(
    user: string,
    session: string,
    provider: Provider,
    method: AiAuthMethod,
  ): AiLoginState | undefined {
    if (
      this.logins.size >= globalLimit ||
      [...this.logins.values()].filter((login) => login.user === user).length >=
        userLimit
    )
      return undefined;
    const state: AiLoginState = {
      id: randomUUID(),
      provider: provider.id,
      method,
      status: "pending",
      events: [],
    };
    const login: Login = {
      user,
      session,
      state,
      controller: new AbortController(),
      timer: setTimeout(() => this.finish(login, "error"), loginTtlMs),
    };
    login.timer.unref();
    this.logins.set(state.id, login);
    // Return initial pending state before invoking any SDK login code.
    setTimeout(() => {
      login.task = this.run(login, provider);
    }, 0).unref();
    return this.snapshot(login);
  }

  get(user: string, session: string, id: string): AiLoginState | undefined {
    const login = this.owned(user, session, id);
    return login ? this.snapshot(login) : undefined;
  }

  respond(
    user: string,
    session: string,
    id: string,
    promptId: string,
    value: string,
  ): AiLoginState | "invalid" | undefined {
    const login = this.owned(user, session, id);
    if (!login) return undefined;
    const pending = login.pending;
    if (
      login.state.status !== "pending" ||
      !pending ||
      login.state.prompt?.id !== promptId ||
      !validAiPromptValue(login.state.provider, pending.sdk, value)
    )
      return "invalid";
    // Never put input in state, events, URLs, or logs. Only the SDK receives it.
    pending.resolve(value);
    return this.snapshot(login);
  }

  async cancel(user: string, session: string, id: string): Promise<boolean> {
    const login = this.owned(user, session, id);
    if (!login) return false;
    this.remove(login);
    // If COMMIT already started, let it finish before the caller refreshes
    // connections. Never delete a previous credential to compensate for cancel.
    await login.task;
    return true;
  }

  async cancelProvider(user: string, provider: string): Promise<void> {
    const tasks: (Promise<void> | undefined)[] = [];
    for (const login of this.logins.values()) {
      if (login.user === user && login.state.provider === provider) {
        this.remove(login);
        tasks.push(login.task);
      }
    }
    await Promise.all(tasks);
  }

  private owned(user: string, session: string, id: string): Login | undefined {
    const login = this.logins.get(id);
    return login?.user === user && login.session === session
      ? login
      : undefined;
  }

  private snapshot(login: Login): AiLoginState {
    return structuredClone(login.state);
  }

  private remove(login: Login): void {
    this.finish(login, "error");
    clearTimeout(login.timer);
    this.logins.delete(login.state.id);
  }

  private finish(login: Login, status: "complete" | "error"): void {
    if (login.state.status !== "pending") return;
    login.state.status = status;
    login.state.events = [];
    login.pending?.reject();
    delete login.state.prompt;
    delete login.pending;
    login.controller.abort();
    clearTimeout(login.timer);
    login.timer = setTimeout(
      () => this.logins.delete(login.state.id),
      finishedTtlMs,
    );
    login.timer.unref();
  }

  private async run(login: Login, provider: Provider): Promise<void> {
    if (login.controller.signal.aborted) return;
    try {
      let credential: Credential | undefined = await this.loginProvider(
        provider,
        login.state.method,
        {
          signal: login.controller.signal,
          prompt: (prompt) => this.prompt(login, prompt),
          notify: (event) => {
            // Some SDK flows allocate a callback listener before their cleanup
            // scope starts. Do not throw here: prompt rejection lets them enter
            // their cleanup scope and close it after an initialization cancel.
            if (login.controller.signal.aborted) return;
            // Copy only serializable SDK event data. Bound the entire event history.
            const json = JSON.stringify(event);
            if (json.length > 8192) throw new Error("Auth event too large");
            const copy: AiAuthEvent = JSON.parse(json);
            login.state.events.push(copy);
            if (login.state.events.length > 32) login.state.events.shift();
          },
        },
        { agentName: "otter", getDeviceId: () => aiDeviceId(this.key) },
      );
      try {
        login.controller.signal.throwIfAborted();
        if (credential.type !== login.state.method)
          throw new Error("Unexpected credential method");
        await this.save(
          login.user,
          provider.id,
          credential,
          login.controller.signal,
        );
      } finally {
        credential = undefined;
      }
      this.finish(login, "complete");
    } catch {
      // Provider exceptions can contain tokens, URLs, or account details.
      this.finish(login, "error");
    }
  }

  private async prompt(login: Login, sdk: AuthPrompt): Promise<string> {
    login.controller.signal.throwIfAborted();
    sdk.signal?.throwIfAborted();
    const automatic = automaticAiChoice(
      login.state.provider,
      login.state.method,
      sdk,
    );
    if (automatic !== undefined) return automatic;
    if (
      !supportedAiPrompt(login.state.provider, login.state.method, sdk) ||
      login.pending
    )
      throw new Error("Unsupported auth prompt");
    const id = randomUUID();
    const prompt: AiAuthPrompt =
      sdk.type === "select"
        ? {
            id,
            type: sdk.type,
            message: sdk.message,
            options: sdk.options.map((option) => ({ ...option })),
          }
        : {
            id,
            type: sdk.type,
            message: sdk.message,
            ...(sdk.placeholder === undefined
              ? {}
              : { placeholder: sdk.placeholder }),
          };
    if (JSON.stringify(prompt).length > 8192)
      throw new Error("Auth prompt too large");
    login.state.prompt = prompt;
    return new Promise<string>((resolve, reject) => {
      const cleanup = () => {
        sdk.signal?.removeEventListener("abort", onAbort);
        login.controller.signal.removeEventListener("abort", onAbort);
        if (login.state.prompt?.id === id) {
          delete login.state.prompt;
          delete login.pending;
        }
      };
      const onAbort = () => {
        cleanup();
        reject(new Error("Login cancelled"));
      };
      login.pending = {
        sdk,
        resolve: (value) => {
          cleanup();
          resolve(value);
        },
        reject: onAbort,
      };
      sdk.signal?.addEventListener("abort", onAbort, { once: true });
      login.controller.signal.addEventListener("abort", onAbort, {
        once: true,
      });
    });
  }
}
