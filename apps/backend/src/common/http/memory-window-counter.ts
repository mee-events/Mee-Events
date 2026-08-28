export const AUTH_IP_RATE_LIMIT_CODE = "AUTH_IP_RATE_LIMIT";
export const AUTH_IP_RATE_LIMIT_MAX = 30;
export const AUTH_IP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Process-local sliding window. Not shared across API instances.
 * Do not treat this as a CDN/WAF substitute.
 */
export class MemoryWindowCounter {
  private readonly hits = new Map<string, number[]>();

  public constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  public allow(key: string): boolean {
    const current = this.now();
    const windowStart = current - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter(
      (stamp) => stamp > windowStart,
    );
    if (recent.length >= this.maxHits) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(current);
    this.hits.set(key, recent);
    return true;
  }
}

export function requestIp(request: {
  readonly ip?: string | undefined;
  readonly socket?: { readonly remoteAddress?: string | undefined };
}): string {
  const socket = request.socket?.remoteAddress?.trim();
  if (socket !== undefined && socket.length > 0) {
    return socket;
  }
  const ip = request.ip?.trim();
  if (ip !== undefined && ip.length > 0) {
    return ip;
  }
  return "unknown";
}
