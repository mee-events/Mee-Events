const DEVELOPMENT_API_ORIGIN = "http://localhost:3002";
const DEVELOPMENT_LOOPBACK_API_ORIGIN = "http://127.0.0.1:3002";

export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=()";

export const HSTS_VALUE = "max-age=31536000; includeSubDomains";

export interface EmployeeSecurityHeaderInput {
  readonly appEnv: string;
  readonly apiBaseUrl: string;
}

export function apiOriginFromBaseUrl(apiBaseUrl: string): string {
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return DEVELOPMENT_API_ORIGIN;
  }
}

/**
 * Minimum CSP that still loads `/` and `/login` without a nonce system.
 * Next's inline bootstrap requires `unsafe-inline`; development tooling also
 * requires `unsafe-eval`. Production omits `unsafe-eval`.
 */
export function buildEmployeeContentSecurityPolicy(
  input: EmployeeSecurityHeaderInput,
): string {
  const apiOrigin = apiOriginFromBaseUrl(input.apiBaseUrl);
  const connect = new Set<string>(["'self'", apiOrigin]);
  if (
    apiOrigin === DEVELOPMENT_API_ORIGIN ||
    apiOrigin === DEVELOPMENT_LOOPBACK_API_ORIGIN
  ) {
    connect.add(DEVELOPMENT_API_ORIGIN);
    connect.add(DEVELOPMENT_LOOPBACK_API_ORIGIN);
  }
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (input.appEnv === "development" || input.appEnv === "test") {
    scriptSources.push("'unsafe-eval'");
  }
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${[...connect].join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function shouldSendEmployeeHsts(appEnv: string): boolean {
  return appEnv === "staging" || appEnv === "production";
}

export function employeeSecurityHeaders(
  input: EmployeeSecurityHeaderInput,
): { key: string; value: string }[] {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Content-Security-Policy",
      value: buildEmployeeContentSecurityPolicy(input),
    },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
  if (shouldSendEmployeeHsts(input.appEnv)) {
    headers.push({
      key: "Strict-Transport-Security",
      value: HSTS_VALUE,
    });
  }
  return headers;
}
