import { normalizeUsername } from "@narumitw/otter-core/username";
import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { api } from "./client-support.js";

type CeremonyOptions<Options> = {
  challengeId: string;
  options: Options;
};

const pendingSignupKey = "otter.passkeySignup";
const signupLifetimeMs = 5 * 60 * 1000;
type PendingSignup = {
  username: string;
  challengeId: string;
  expiresAt: number;
};
let pendingSignup: PendingSignup | undefined;

function isPendingSignup(value: unknown): value is PendingSignup {
  return (
    typeof value === "object" &&
    value !== null &&
    "username" in value &&
    typeof value.username === "string" &&
    "challengeId" in value &&
    typeof value.challengeId === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number" &&
    Number.isFinite(value.expiresAt)
  );
}

function storePendingSignup(value: PendingSignup | undefined): void {
  pendingSignup = value;
  try {
    if (value) sessionStorage.setItem(pendingSignupKey, JSON.stringify(value));
    else sessionStorage.removeItem(pendingSignupKey);
  } catch {
    // Keep the token in memory when browser storage is unavailable.
  }
}

function getPendingSignup(): PendingSignup | undefined {
  try {
    const stored = sessionStorage.getItem(pendingSignupKey);
    if (stored) {
      const value: unknown = JSON.parse(stored);
      if (isPendingSignup(value)) {
        pendingSignup = value;
      } else {
        storePendingSignup(undefined);
      }
    }
  } catch {
    // Fall back to the current tab's in-memory token.
  }
  if (pendingSignup && pendingSignup.expiresAt <= Date.now()) {
    storePendingSignup(undefined);
  }
  return pendingSignup;
}

export function pendingPasskeySignupChallengeId(
  username: string,
): string | undefined {
  const pending = getPendingSignup();
  return pending?.username === normalizeUsername(username)
    ? pending.challengeId
    : undefined;
}

export function clearPendingPasskeySignup(username: string): void {
  if (pendingPasskeySignupChallengeId(username)) storePendingSignup(undefined);
}

export type PasskeySummary = {
  backedUp: boolean;
  createdAt: string;
  deviceType: "multiDevice" | "singleDevice";
  id: string;
  lastUsedAt: string | null;
};

export function supportsPasskeys(): boolean {
  return browserSupportsWebAuthn();
}

export async function registerPasskey(): Promise<void> {
  const ceremony = await api<
    CeremonyOptions<PublicKeyCredentialCreationOptionsJSON>
  >("/api/passkeys/registration/options", { method: "POST" });
  const response = await startRegistration({ optionsJSON: ceremony.options });
  await api<{ ok: true }>("/api/passkeys/registration/verify", {
    body: JSON.stringify({ challengeId: ceremony.challengeId, response }),
    method: "POST",
  });
}

export async function createAccountWithPasskey(
  username: string,
): Promise<void> {
  const challengeId = pendingPasskeySignupChallengeId(username);
  const ceremony = await api<
    CeremonyOptions<PublicKeyCredentialCreationOptionsJSON>
  >("/api/auth/passkey/register/options", {
    body: JSON.stringify({ username, ...(challengeId ? { challengeId } : {}) }),
    method: "POST",
  });
  storePendingSignup({
    username: normalizeUsername(username),
    challengeId: ceremony.challengeId,
    expiresAt: Date.now() + signupLifetimeMs,
  });
  const response = await startRegistration({ optionsJSON: ceremony.options });
  await api("/api/auth/passkey/register/verify", {
    body: JSON.stringify({ challengeId: ceremony.challengeId, response }),
    method: "POST",
  });
  clearPendingPasskeySignup(username);
}

export async function authenticateWithPasskey(): Promise<void> {
  const ceremony = await api<
    CeremonyOptions<PublicKeyCredentialRequestOptionsJSON>
  >("/api/auth/passkey/options", { method: "POST" });
  const response = await startAuthentication({
    optionsJSON: ceremony.options,
  });
  await api<{ ok: true }>("/api/auth/passkey/verify", {
    body: JSON.stringify({ challengeId: ceremony.challengeId, response }),
    method: "POST",
  });
}
