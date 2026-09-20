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
