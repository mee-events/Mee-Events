import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Buffer } from "node:buffer";
import { DomainError } from "../../../common/errors/domain.error";
import {
  EXOTEL_INDIA_API_BASE_URL,
  EXOTEL_OTP_PLACEHOLDER,
  EXOTEL_REQUEST_TIMEOUT_MAX_MS,
  EXOTEL_REQUEST_TIMEOUT_MIN_MS,
} from "../../../config/environment";
import type { OtpDelivery, OtpProvider } from "../ports/otp-provider";
import {
  EXOTEL_HTTP_TRANSPORT,
  type ExotelHttpTransport,
} from "./exotel-http.transport";

interface ExotelConfiguration {
  readonly apiBaseUrl: string;
  readonly apiKey: string;
  readonly apiToken: string;
  readonly accountSid: string;
  readonly senderId: string;
  readonly dltEntityId: string;
  readonly dltTemplateId: string;
  readonly bodyTemplate: string;
  readonly timeoutMs: number;
}

@Injectable()
export class ExotelOtpProvider implements OtpProvider {
  public constructor(
    private readonly config: ConfigService,
    @Inject(EXOTEL_HTTP_TRANSPORT)
    private readonly transport: ExotelHttpTransport,
  ) {}

  public async sendCode(
    mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    if (
      !/^\+91[6-9][0-9]{9}$/u.test(mobileNumber) ||
      !/^[0-9]{6}$/u.test(code)
    ) {
      throw providerError(
        "OTP_PROVIDER_INPUT_INVALID",
        "OTP delivery request is invalid",
        400,
      );
    }

    const settings = this.loadConfiguration();
    const endpoint = `${settings.apiBaseUrl}/v1/Accounts/${encodeURIComponent(settings.accountSid)}/Sms/send`;
    const body = new URLSearchParams({
      From: settings.senderId,
      To: mobileNumber,
      Body: settings.bodyTemplate.replace(EXOTEL_OTP_PLACEHOLDER, code),
      DltEntityId: settings.dltEntityId,
      DltTemplateId: settings.dltTemplateId,
      SmsType: "transactional",
    }).toString();

    let response: Awaited<ReturnType<ExotelHttpTransport["post"]>>;
    try {
      response = await this.transport.post({
        url: endpoint,
        headers: {
          Authorization: `Basic ${Buffer.from(`${settings.apiKey}:${settings.apiToken}`, "utf8").toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        timeoutMs: settings.timeoutMs,
      });
    } catch {
      throw providerError(
        "OTP_PROVIDER_UNAVAILABLE",
        "OTP delivery is unavailable",
        503,
      );
    }

    if (response.status !== 200) {
      throw mapHttpFailure(response.status);
    }

    const providerMessageId = readProviderMessageId(response.body);
    if (providerMessageId === undefined) {
      throw providerError(
        "OTP_PROVIDER_MALFORMED_RESPONSE",
        "OTP delivery is unavailable",
        503,
      );
    }

    return { providerMessageId };
  }

  private loadConfiguration(): ExotelConfiguration {
    const settings: ExotelConfiguration = {
      apiBaseUrl: this.readString("EXOTEL_API_BASE_URL"),
      apiKey: this.readString("EXOTEL_API_KEY"),
      apiToken: this.readString("EXOTEL_API_TOKEN"),
      accountSid: this.readString("EXOTEL_ACCOUNT_SID"),
      senderId: this.readString("EXOTEL_SMS_SENDER_ID"),
      dltEntityId: this.readString("EXOTEL_DLT_ENTITY_ID"),
      dltTemplateId: this.readString("EXOTEL_DLT_TEMPLATE_ID"),
      bodyTemplate: this.readString("EXOTEL_OTP_BODY_TEMPLATE"),
      timeoutMs: this.config.get<number>("EXOTEL_REQUEST_TIMEOUT_MS") ?? 0,
    };

    const placeholderCount =
      settings.bodyTemplate.split(EXOTEL_OTP_PLACEHOLDER).length - 1;
    const fixedCopy = settings.bodyTemplate.replace(EXOTEL_OTP_PLACEHOLDER, "");
    if (
      settings.apiBaseUrl !== EXOTEL_INDIA_API_BASE_URL ||
      !/^[A-Za-z0-9._-]{1,128}$/u.test(settings.apiKey) ||
      settings.apiToken.length > 512 ||
      hasControlCharacters(settings.apiToken) ||
      !/^[A-Za-z0-9_-]{1,128}$/u.test(settings.accountSid) ||
      !/^[A-Za-z0-9]{1,11}$/u.test(settings.senderId) ||
      !/^[0-9]{1,32}$/u.test(settings.dltEntityId) ||
      !/^[0-9]{1,32}$/u.test(settings.dltTemplateId) ||
      placeholderCount !== 1 ||
      settings.bodyTemplate.length > 480 ||
      hasControlCharacters(settings.bodyTemplate) ||
      /[\u2028\u2029]/u.test(settings.bodyTemplate) ||
      /(?:https?:\/\/|www\.)/iu.test(settings.bodyTemplate) ||
      /[{}]/u.test(fixedCopy) ||
      settings.timeoutMs < EXOTEL_REQUEST_TIMEOUT_MIN_MS ||
      settings.timeoutMs > EXOTEL_REQUEST_TIMEOUT_MAX_MS
    ) {
      throw providerError(
        "OTP_PROVIDER_UNCONFIGURED",
        "OTP delivery is unavailable",
        503,
      );
    }

    return settings;
  }

  private readString(key: string): string {
    const value = this.config.get<unknown>(key);
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value !== value.trim()
    ) {
      throw providerError(
        "OTP_PROVIDER_UNCONFIGURED",
        "OTP delivery is unavailable",
        503,
      );
    }
    return value;
  }
}

function readProviderMessageId(body: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || !isRecord(parsed.SMSMessage)) {
    return undefined;
  }
  const sid = parsed.SMSMessage.Sid;
  if (typeof sid !== "string") {
    return undefined;
  }
  const normalized = sid.trim();
  if (
    sid !== normalized ||
    normalized.length === 0 ||
    normalized.length > 256 ||
    hasControlCharacters(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function mapHttpFailure(status: number): DomainError {
  if (status === 400) {
    return providerError(
      "OTP_PROVIDER_REQUEST_REJECTED",
      "OTP delivery is unavailable",
      503,
    );
  }
  if (status === 401 || status === 403) {
    return providerError(
      "OTP_PROVIDER_AUTHENTICATION_FAILED",
      "OTP delivery is unavailable",
      503,
    );
  }
  if (status === 429) {
    return providerError(
      "OTP_PROVIDER_RATE_LIMITED",
      "OTP delivery is unavailable",
      503,
    );
  }
  return providerError(
    "OTP_PROVIDER_UNAVAILABLE",
    "OTP delivery is unavailable",
    503,
  );
}

function providerError(
  code: string,
  message: string,
  status: number,
): DomainError {
  return new DomainError(code, message, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}
