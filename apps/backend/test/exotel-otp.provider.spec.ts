import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EXOTEL_INDIA_API_BASE_URL } from "../src/config/environment";
import {
  FetchExotelHttpTransport,
  type ExotelHttpRequest,
  type ExotelHttpResponse,
  type ExotelHttpTransport,
} from "../src/modules/identity/adapters/exotel-http.transport";
import { ExotelOtpProvider } from "../src/modules/identity/adapters/exotel-otp.provider";
import { selectOtpProvider } from "../src/modules/identity/identity.module";
import type { OtpProvider } from "../src/modules/identity/ports/otp-provider";

const MOBILE_NUMBER = "+919876543210";
const OTP_CODE = "123456";
const PROVIDER_MESSAGE_ID = "synthetic-message-id";

const exotelConfig: Readonly<Record<string, unknown>> = {
  EXOTEL_API_BASE_URL: EXOTEL_INDIA_API_BASE_URL,
  EXOTEL_API_KEY: "synthetic-api-key",
  EXOTEL_API_TOKEN: "synthetic-api-token",
  EXOTEL_ACCOUNT_SID: "synthetic_account",
  EXOTEL_SMS_SENDER_ID: "MEEEVT",
  EXOTEL_DLT_ENTITY_ID: "100000000000000001",
  EXOTEL_DLT_TEMPLATE_ID: "200000000000000002",
  EXOTEL_OTP_BODY_TEMPLATE:
    "Your Mee Events sign-in code is {{OTP}}. It expires in five minutes.",
  EXOTEL_REQUEST_TIMEOUT_MS: 5000,
};

class FakeExotelHttpTransport implements ExotelHttpTransport {
  public readonly calls: ExotelHttpRequest[] = [];

  public response: ExotelHttpResponse = {
    status: 200,
    body: JSON.stringify({ SMSMessage: { Sid: PROVIDER_MESSAGE_ID } }),
  };

  public failure: Error | undefined;

  public async post(request: ExotelHttpRequest): Promise<ExotelHttpResponse> {
    this.calls.push(request);
    if (this.failure !== undefined) throw this.failure;
    return this.response;
  }
}

function createProvider(
  transport = new FakeExotelHttpTransport(),
  overrides: Readonly<Record<string, unknown>> = {},
): { provider: ExotelOtpProvider; transport: FakeExotelHttpTransport } {
  const values = { ...exotelConfig, ...overrides };
  const config = {
    get: (key: string): unknown => values[key],
  } as unknown as ConfigService;
  return { provider: new ExotelOtpProvider(config, transport), transport };
}

async function captureFailure(action: () => Promise<unknown>): Promise<Error> {
  try {
    await action();
  } catch (error) {
    return error instanceof Error ? error : new Error("Non-error failure");
  }
  throw new Error("Expected action to fail");
}

describe("ExotelOtpProvider request construction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("constructs one official India form request with header-only credentials", async () => {
    const { provider, transport } = createProvider();

    await provider.sendCode(MOBILE_NUMBER, OTP_CODE);

    expect(transport.calls).toHaveLength(1);
    const request = transport.calls[0];
    expect(request).toBeDefined();
    if (request === undefined) throw new Error("Missing synthetic request");
    expect(request.url).toBe(
      `${EXOTEL_INDIA_API_BASE_URL}/v1/Accounts/synthetic_account/Sms/send`,
    );
    const parsedUrl = new URL(request.url);
    expect(parsedUrl.username).toBe("");
    expect(parsedUrl.password).toBe("");
    expect(request.url).not.toContain(String(exotelConfig.EXOTEL_API_KEY));
    expect(request.url).not.toContain(String(exotelConfig.EXOTEL_API_TOKEN));
    expect(request.headers.Authorization).toBe(
      `Basic ${Buffer.from("synthetic-api-key:synthetic-api-token", "utf8").toString("base64")}`,
    );
    expect(request.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(request.timeoutMs).toBe(5000);

    const form = new URLSearchParams(request.body);
    expect([...form.keys()].sort()).toEqual(
      ["Body", "DltEntityId", "DltTemplateId", "From", "SmsType", "To"].sort(),
    );
    expect(form.get("From")).toBe("MEEEVT");
    expect(form.get("To")).toBe(MOBILE_NUMBER);
    expect(form.get("Body")).toBe(
      "Your Mee Events sign-in code is 123456. It expires in five minutes.",
    );
    expect(form.get("DltEntityId")).toBe("100000000000000001");
    expect(form.get("DltTemplateId")).toBe("200000000000000002");
    expect(form.get("SmsType")).toBe("transactional");
    expect(form.get("Body")).not.toContain("{{OTP}}");
  });

  it("returns only the accepted provider message identifier", async () => {
    const { provider } = createProvider();

    const delivery = await provider.sendCode(MOBILE_NUMBER, OTP_CODE);

    expect(delivery).toEqual({ providerMessageId: PROVIDER_MESSAGE_ID });
    expect(Object.keys(delivery)).toEqual(["providerMessageId"]);
    expect(JSON.stringify(delivery)).not.toContain(MOBILE_NUMBER);
    expect(JSON.stringify(delivery)).not.toContain(OTP_CODE);
    expect(JSON.stringify(delivery).toLowerCase()).not.toContain("delivered");
  });

  it.each([
    ["non-canonical number", "9876543210", OTP_CODE],
    ["non-India number", "+6598765432", OTP_CODE],
    ["too-short number", "+91987654321", OTP_CODE],
    ["non-numeric OTP", MOBILE_NUMBER, "12A456"],
    ["too-short OTP", MOBILE_NUMBER, "12345"],
    ["too-long OTP", MOBILE_NUMBER, "1234567"],
  ])("rejects %s before transport", async (_case, mobileNumber, code) => {
    const { provider, transport } = createProvider();

    await expect(provider.sendCode(mobileNumber, code)).rejects.toMatchObject({
      code: "OTP_PROVIDER_INPUT_INVALID",
      status: 400,
    });
    expect(transport.calls).toHaveLength(0);
  });

  it("fails safely when required runtime configuration is missing", async () => {
    const { provider, transport } = createProvider(
      new FakeExotelHttpTransport(),
      { EXOTEL_API_TOKEN: undefined },
    );

    await expect(
      provider.sendCode(MOBILE_NUMBER, OTP_CODE),
    ).rejects.toMatchObject({ code: "OTP_PROVIDER_UNCONFIGURED", status: 503 });
    expect(transport.calls).toHaveLength(0);
  });

  it("fails safely if runtime configuration bypasses the host allowlist", async () => {
    const { provider, transport } = createProvider(
      new FakeExotelHttpTransport(),
      { EXOTEL_API_BASE_URL: "https://unapproved.internal.test" },
    );

    await expect(
      provider.sendCode(MOBILE_NUMBER, OTP_CODE),
    ).rejects.toMatchObject({ code: "OTP_PROVIDER_UNCONFIGURED", status: 503 });
    expect(transport.calls).toHaveLength(0);
  });

  it.each([
    [400, "OTP_PROVIDER_REQUEST_REJECTED"],
    [401, "OTP_PROVIDER_AUTHENTICATION_FAILED"],
    [403, "OTP_PROVIDER_AUTHENTICATION_FAILED"],
    [429, "OTP_PROVIDER_RATE_LIMITED"],
    [500, "OTP_PROVIDER_UNAVAILABLE"],
    [503, "OTP_PROVIDER_UNAVAILABLE"],
  ])("maps HTTP %i without retrying", async (status, expectedCode) => {
    const transport = new FakeExotelHttpTransport();
    transport.response = {
      status,
      body: '{"RestException":{"Message":"raw provider detail"}}',
    };
    const { provider } = createProvider(transport);

    const error = await captureFailure(() =>
      provider.sendCode(MOBILE_NUMBER, OTP_CODE),
    );

    expect(error).toMatchObject({ code: expectedCode, status: 503 });
    expect(error.message).toBe("OTP delivery is unavailable");
    expect(error.message).not.toContain("raw provider detail");
    expect(transport.calls).toHaveLength(1);
  });

  it.each([
    ["invalid JSON", "not-json"],
    ["missing SMSMessage", JSON.stringify({})],
    ["missing Sid", JSON.stringify({ SMSMessage: {} })],
    ["empty Sid", JSON.stringify({ SMSMessage: { Sid: "   " } })],
  ])("rejects a 200 response with %s", async (_case, responseBody) => {
    const transport = new FakeExotelHttpTransport();
    transport.response = { status: 200, body: responseBody };
    const { provider } = createProvider(transport);

    await expect(
      provider.sendCode(MOBILE_NUMBER, OTP_CODE),
    ).rejects.toMatchObject({
      code: "OTP_PROVIDER_MALFORMED_RESPONSE",
      status: 503,
    });
    expect(transport.calls).toHaveLength(1);
  });

  it.each(["network failure", "timeout"])(
    "maps a %s safely and makes no retry",
    async (failureKind) => {
      const transport = new FakeExotelHttpTransport();
      transport.failure = new Error(`raw ${failureKind} provider detail`);
      const { provider } = createProvider(transport);

      const error = await captureFailure(() =>
        provider.sendCode(MOBILE_NUMBER, OTP_CODE),
      );

      expect(error).toMatchObject({
        code: "OTP_PROVIDER_UNAVAILABLE",
        status: 503,
      });
      expect(error.message).toBe("OTP delivery is unavailable");
      expect(transport.calls).toHaveLength(1);
    },
  );

  it("does not log credentials, OTP, rendered body, provider response, or number", async () => {
    const nestLog = vi.spyOn(Logger.prototype, "log");
    const nestWarn = vi.spyOn(Logger.prototype, "warn");
    const nestError = vi.spyOn(Logger.prototype, "error");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { provider } = createProvider();

    await provider.sendCode(MOBILE_NUMBER, OTP_CODE);

    expect(nestLog).not.toHaveBeenCalled();
    expect(nestWarn).not.toHaveBeenCalled();
    expect(nestError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("selects only the explicit local or Exotel provider", () => {
    const local = { sendCode: vi.fn() } as unknown as OtpProvider;
    const exotel = { sendCode: vi.fn() } as unknown as OtpProvider;

    expect(selectOtpProvider("local", local, exotel)).toBe(local);
    expect(selectOtpProvider("exotel", local, exotel)).toBe(exotel);
    expect(() => selectOtpProvider("external", local, exotel)).toThrow(
      "Unsupported OTP provider selection",
    );
  });

  it("aborts the built-in fetch transport at its configured timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("synthetic abort", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pending = new FetchExotelHttpTransport().post({
      url: EXOTEL_INDIA_API_BASE_URL,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "synthetic=form",
      timeoutMs: 1000,
    });
    const assertion = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });

    await vi.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
