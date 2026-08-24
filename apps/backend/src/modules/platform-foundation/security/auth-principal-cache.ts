import type { AuthenticatedPrincipal } from "../domain/platform-foundation";

interface CacheEntry {
  readonly principal: AuthenticatedPrincipal;
  readonly sessionExpiresAtMs: number;
  readonly cachedAtMs: number;
}

/**
 * Process-local short-TTL cache for AccessTokenGuard.
 * Avoids Redis until measurements show multi-instance session fan-out requires it.
 * Default TTL 15s balances revocation latency vs DB load under concurrent requests.
 */
export class AuthPrincipalCache {
  private readonly entries = new Map<string, CacheEntry>();

  public constructor(
    private readonly ttlMs: number = 15_000,
    private readonly maxEntries: number = 10_000,
  ) {}

  public get(
    sessionId: string,
    role: string,
  ): AuthenticatedPrincipal | undefined {
    const key = this.key(sessionId, role);
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    const now = Date.now();
    if (
      now - entry.cachedAtMs > this.ttlMs ||
      entry.sessionExpiresAtMs <= now
    ) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.principal;
  }

  public set(
    sessionId: string,
    role: string,
    principal: AuthenticatedPrincipal,
    sessionExpiresAt: string,
  ): void {
    if (this.entries.size >= this.maxEntries) {
      this.evictOldest();
    }
    this.entries.set(this.key(sessionId, role), {
      principal,
      sessionExpiresAtMs: Date.parse(sessionExpiresAt),
      cachedAtMs: Date.now(),
    });
  }

  public invalidateSession(sessionId: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.entries.delete(key);
      }
    }
  }

  public invalidateUser(userId: string): void {
    for (const [key, entry] of this.entries) {
      if (entry.principal.userId === userId) {
        this.entries.delete(key);
      }
    }
  }

  public clear(): void {
    this.entries.clear();
  }

  public get size(): number {
    return this.entries.size;
  }

  private key(sessionId: string, role: string): string {
    return `${sessionId}:${role}`;
  }

  private evictOldest(): void {
    const first = this.entries.keys().next().value;
    if (first !== undefined) {
      this.entries.delete(first);
    }
  }
}

export const authPrincipalCache = new AuthPrincipalCache();
