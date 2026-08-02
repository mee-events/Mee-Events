import { Injectable, Logger } from "@nestjs/common";
import type { OtpDelivery, OtpProvider } from "../ports/otp-provider";

@Injectable()
export class LocalOtpProvider implements OtpProvider {
  private readonly logger = new Logger(LocalOtpProvider.name);

  public async sendCode(
    mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    // Intentionally logged in cleartext for local development only.
    // Look for this line in the NestJS terminal when testing OTP login.
    this.logger.warn(
      `LOCAL OTP for ${mobileNumber}: ${code} (dev only — never use this provider in production)`,
    );
    return { providerMessageId: `local-${String(Date.now())}` };
  }
}
