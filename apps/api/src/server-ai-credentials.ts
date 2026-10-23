import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import type { Credential } from "@earendil-works/pi-ai";
import type { AiConnection } from "@narumitw/otter-contracts";
import type { Pool as PgPool, PoolClient } from "pg";
import { withTransaction } from "./server-support.js";

// Invalid or absent configuration disables new connections. Never generate a key.
export function aiCredentialsKey(
  value: string | undefined,
): Buffer | undefined {
  if (value?.length !== 64 || /[^0-9a-f]/i.test(value)) return undefined;
  return Buffer.from(value, "hex");
}

function aad(user: string, provider: string): Buffer {
  return Buffer.from(
    JSON.stringify(["otter-ai-credential-v1", user, provider]),
  );
}

export function encryptAiCredential(
  key: Buffer,
  user: string,
  provider: string,
  credential: Credential,
): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(user, provider));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credential), "utf8"),
    cipher.final(),
  ]);
  // Version, nonce, authentication tag, ciphertext.
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptAiCredential(
  key: Buffer,
  user: string,
  provider: string,
  encrypted: Buffer,
): Credential {
  if (encrypted[0] !== 1 || encrypted.length < 30)
    throw new Error("Invalid encrypted credential");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    key,
    encrypted.subarray(1, 13),
  );
  cipher.setAAD(aad(user, provider));
  cipher.setAuthTag(encrypted.subarray(13, 29));
  const value: unknown = JSON.parse(
    Buffer.concat([
      cipher.update(encrypted.subarray(29)),
      cipher.final(),
    ]).toString("utf8"),
  );
  if (!isCredential(value)) throw new Error("Invalid credential");
  return value;
}

function isCredential(value: unknown): value is Credential {
  if (!value || typeof value !== "object") return false;
  if (!("type" in value)) return false;
  if (value.type === "api_key")
    return "key" in value && typeof value.key === "string";
  return (
    value.type === "oauth" &&
    "access" in value &&
    typeof value.access === "string" &&
    "refresh" in value &&
    typeof value.refresh === "string" &&
    "expires" in value &&
    typeof value.expires === "number"
  );
}

export function aiDeviceId(key: Buffer): string {
  const bytes = createHmac("sha256", key)
    .update("otter-ai-installation-device-id-v1")
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Serialize preference saves, credential replacement, and disconnect on the user row.
export async function withAiUserLock<T>(
  pool: PgPool,
  user: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTransaction(pool, async (client) => {
    const result = await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [user],
    );
    if (!result.rowCount) throw new Error("Account no longer exists");
    return fn(client);
  });
}

export function aiCredentialStore(pool: PgPool, key: Buffer | undefined) {
  return {
    async list(user: string): Promise<AiConnection[]> {
      const result = await pool.query<AiConnection>(
        "SELECT provider, method FROM user_ai_credentials WHERE user_id = $1 ORDER BY provider",
        [user],
      );
      return result.rows;
    },
    async save(
      user: string,
      provider: string,
      credential: Credential,
      signal: AbortSignal,
    ): Promise<void> {
      if (!key || !isCredential(credential))
        throw new Error("Cannot store credential");
      const encrypted = encryptAiCredential(key, user, provider, credential);
      await withAiUserLock(pool, user, async (client) => {
        signal.throwIfAborted();
        await client.query(
          `INSERT INTO user_ai_credentials (user_id, provider, method, encrypted_credential)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, provider) DO UPDATE
           SET method = EXCLUDED.method, encrypted_credential = EXCLUDED.encrypted_credential`,
          [user, provider, credential.type, encrypted],
        );
        signal.throwIfAborted();
      });
    },
    async disconnect(user: string, provider: string): Promise<void> {
      await withAiUserLock(pool, user, async (client) => {
        await client.query(
          "DELETE FROM user_ai_credentials WHERE user_id = $1 AND provider = $2",
          [user, provider],
        );
        await client.query(
          "DELETE FROM user_ai_settings WHERE user_id = $1 AND provider = $2",
          [user, provider],
        );
      });
    },
  };
}
