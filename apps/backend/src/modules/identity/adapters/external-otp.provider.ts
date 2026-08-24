import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DomainError } from "../../../common/errors/domain.error";
import type { OtpDelivery, OtpProvider } from "../ports/otp-provider";

/**
 * Production OTP provider port.
 *
 * Wire a real SMS vendor behind this class once credentials exist. Until then,
 * fail closed so staging/production cannot silently fall back to local OTP.
 */
@Injectable()
export class ExternalOtpProvider implements OtpProvider {
  public constructor(private readonly config: ConfigService) {}

  public async sendCode(
    mobileNumber: string,
    _code: string,
  ): Promise<OtpDelivery> {
    const endpoint = this.config.get<string>("SMS_OTP_ENDPOINT");
    const apiKey = this.config.get<string>("SMS_OTP_API_KEY");
    if (
      endpoint === undefined ||
      endpoint.length === 0 ||
      apiKey === undefined ||
      apiKey.length === 0
    ) {
      throw new DomainError(
        "OTP_PROVIDER_UNCONFIGURED",
        "External SMS OTP is not configured (SMS_OTP_ENDPOINT / SMS_OTP_API_KEY)",
        503,
      );
    }

    // Vendor HTTP integration lands with production SMS credentials.
    // Do not log the OTP code or API key.
    void mobileNumber;
    throw new DomainError(
      "OTP_PROVIDER_UNCONFIGURED",
      "External SMS OTP endpoint is configured but the vendor adapter is not wired yet",
      503,
    );
  }
}
