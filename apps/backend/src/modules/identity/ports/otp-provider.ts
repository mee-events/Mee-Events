export const OTP_PROVIDER = Symbol("OTP_PROVIDER");

export interface OtpDelivery {
  readonly providerMessageId: string;
}

export interface OtpProvider {
  sendCode(mobileNumber: string, code: string): Promise<OtpDelivery>;
}
