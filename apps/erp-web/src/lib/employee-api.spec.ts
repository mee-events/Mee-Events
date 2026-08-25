import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listLeads,
  readStoredSession,
  storeSession,
  type EmployeeSession,
} from "./employee-api";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("employee API session refresh", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rotates tokens and retries a protected request after 401", async () => {
    const session: EmployeeSession = {
      accessToken: "expired-access-token",
      refreshToken: "current-refresh-token",
      userId: "employee-1",
      mobileNumber: "+919000000001",
      lastActiveRole: "employee",
    };
    storeSession(session);

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 401,
            code: "ACCESS_TOKEN_INVALID",
            message: "Access token is invalid",
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "rotated-access-token",
            refreshToken: "rotated-refresh-token",
            accessTokenExpiresInSeconds: 900,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ leads: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listLeads(session);

    expect(result.leads).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/crm\/leads$/);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer expired-access-token",
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ refreshToken: "current-refresh-token" }),
    });
    expect(String(fetchMock.mock.calls[2]?.[0])).toMatch(/\/crm\/leads$/);
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer rotated-access-token",
    });
    expect(readStoredSession()).toMatchObject({
      accessToken: "rotated-access-token",
      refreshToken: "rotated-refresh-token",
    });
  });
});
