const DEVELOPMENT_API_BASE_URL = "http://localhost:3002/api/v1";

export type EmployeePublicEnv = {
  readonly NEXT_PUBLIC_APP_ENV?: string;
  readonly NEXT_PUBLIC_API_BASE_URL?: string;
};

export function resolveEmployeeAppEnv(
  env: EmployeePublicEnv = {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
): string {
  const value = env.NEXT_PUBLIC_APP_ENV?.trim();
  return value && value.length > 0 ? value : "development";
}

export function resolveEmployeeApiBaseUrl(
  env: EmployeePublicEnv = {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
): string {
  const appEnv = resolveEmployeeAppEnv(env);
  const configured = env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const value = (
    configured && configured.length > 0 ? configured : DEVELOPMENT_API_BASE_URL
  ).replace(/\/+$/, "");

  if (appEnv === "staging" || appEnv === "production") {
    if (!configured) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL is required when NEXT_PUBLIC_APP_ENV is staging or production",
      );
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid URL");
    }

    if (url.protocol !== "https:") {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must use https in staging and production",
      );
    }

    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must not target a loopback host in staging or production",
      );
    }
  }

  return value;
}
