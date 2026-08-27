const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertLoopbackHttpUrl(
  name: string,
  value: string | undefined,
): string {
  const raw = value?.trim() ?? "";
  if (raw.length === 0) {
    throw new Error(`E2E fail-closed: ${name} is required`);
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`E2E fail-closed: ${name} is not a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`E2E fail-closed: ${name} must be http or https`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`E2E fail-closed: ${name} must not include userinfo`);
  }

  const host = parsed.hostname.toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(
      `E2E fail-closed: ${name} must target loopback (localhost, 127.0.0.1, or ::1)`,
    );
  }

  return raw.replace(/\/+$/, "");
}

export function isLoopbackHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
