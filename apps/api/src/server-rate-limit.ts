export type FixedWindowRateLimitOptions = {
  globalLimit: number;
  perClientLimit: number;
  trustProxy?: boolean;
  windowMs: number;
};

function firstForwardedValue(value: string | null): string | undefined {
  return value?.split(",", 1)[0]?.trim() || undefined;
}

function requestClient(
  req: Request,
  remoteAddress: string | undefined,
  trustProxy: boolean,
): string | undefined {
  const forwardedClient = trustProxy
    ? (firstForwardedValue(req.headers.get("x-forwarded-for")) ??
      firstForwardedValue(req.headers.get("x-real-ip")))
    : undefined;
  return forwardedClient ?? (remoteAddress?.trim() || undefined);
}

export function createFixedWindowRateLimiter({
  globalLimit,
  perClientLimit,
  trustProxy = false,
  windowMs,
}: FixedWindowRateLimitOptions) {
  let globalCount = 0;
  let resetAt = 0;
  const clientCounts = new Map<string, number>();

  return (
    req: Request,
    remoteAddress?: string,
    now = Date.now(),
  ): number | undefined => {
    if (now >= resetAt) {
      globalCount = 0;
      resetAt = now + windowMs;
      clientCounts.clear();
    }

    const client = requestClient(req, remoteAddress, trustProxy);
    const clientCount = client ? (clientCounts.get(client) ?? 0) : 0;
    if (
      globalCount >= globalLimit ||
      (client !== undefined && clientCount >= perClientLimit)
    ) {
      return Math.max(1, Math.ceil((resetAt - now) / 1000));
    }

    globalCount += 1;
    if (client) clientCounts.set(client, clientCount + 1);
    return undefined;
  };
}
