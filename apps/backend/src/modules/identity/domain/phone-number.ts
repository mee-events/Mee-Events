import { parsePhoneNumberFromString } from "libphonenumber-js";
import { DomainError } from "../../../common/errors/domain.error";

export function normalizeMobileNumber(
  input: string,
  countryCode?: string,
): string {
  const phone = parsePhoneNumberFromString(input, countryCode as never);
  if (
    phone === undefined ||
    !phone.isValid() ||
    phone.getType() === "FIXED_LINE"
  ) {
    throw new DomainError(
      "INVALID_MOBILE_NUMBER",
      "Enter a valid mobile number including country code",
      400,
    );
  }
  return phone.number;
}
