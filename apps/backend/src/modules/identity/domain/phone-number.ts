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
    phone.getType() === "FIXED_LINE" ||
    (phone.country === "IN" && !/^\+91[6-9]\d{9}$/u.test(phone.number))
  ) {
    throw new DomainError(
      "INVALID_MOBILE_NUMBER",
      "Enter a valid mobile number including country code",
      400,
    );
  }
  return phone.number;
}
