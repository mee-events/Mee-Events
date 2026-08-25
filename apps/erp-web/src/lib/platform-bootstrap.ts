import type { PlatformBootstrapResponse } from "@me-event/api-contracts";
import { resolveEmployeeApiBaseUrl } from "./environment";

const apiBaseUrl = resolveEmployeeApiBaseUrl();

export const EMPLOYEE_BOOTSTRAP_ENDPOINT = `${apiBaseUrl}/platform/bootstrap`;

export type EmployeePlatformBootstrap = PlatformBootstrapResponse & {
  readonly client: PlatformBootstrapResponse["client"] & {
    readonly surface: "employee_web";
  };
};

export function isEmployeePlatformBootstrap(
  value: unknown,
): value is EmployeePlatformBootstrap {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    client?: { surface?: unknown };
  };

  return candidate.client?.surface === "employee_web";
}

export async function loadEmployeePlatformBootstrap(
  accessToken: string,
  signal?: AbortSignal,
): Promise<EmployeePlatformBootstrap> {
  if (accessToken.trim().length === 0) {
    throw new Error(
      "An access token is required to load the employee platform.",
    );
  }

  const response = await fetch(EMPLOYEE_BOOTSTRAP_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Employee platform bootstrap failed (${response.status}).`);
  }

  const bootstrap: unknown = await response.json();

  if (!isEmployeePlatformBootstrap(bootstrap)) {
    throw new Error("The authenticated role cannot open the Employee portal.");
  }

  return bootstrap;
}

export const employeeBootstrapConnection = Object.freeze({
  endpoint: EMPLOYEE_BOOTSTRAP_ENDPOINT,
  connected: false,
  source: "local-foundation",
} as const);
