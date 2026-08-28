import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalOtpProvider } from "../src/modules/identity/adapters/local-otp.provider";

describe("LocalOtpProvider logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log or return the OTP code or mobile number", async () => {
    const nestLog = vi.spyOn(Logger.prototype, "log");
    const nestWarn = vi.spyOn(Logger.prototype, "warn");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const mobileNumber = "+919999999999";
    const code = "918273";

    const delivery = await new LocalOtpProvider().sendCode(mobileNumber, code);

    expect(nestLog).not.toHaveBeenCalled();
    expect(nestWarn).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(JSON.stringify(delivery)).not.toContain(code);
    expect(JSON.stringify(delivery)).not.toContain(mobileNumber);
  });
});
