import { Injectable } from "@nestjs/common";
import type { OtpDelivery, OtpProvider } from "../ports/otp-provider";

@Injectable()
export class LocalOtpProvider implements OtpProvider {
  public async sendCode(
    _mobileNumber: string,
    _code: string,
  ): Promise<OtpDelivery> {
    // AuthService returns debugCode only in local development. Never log it.
    return { providerMessageId: `local-${String(Date.now())}` };
  }
}
