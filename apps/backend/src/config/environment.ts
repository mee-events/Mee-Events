import { z } from "zod";

const appEnvSchema = z.enum(["development", "test", "staging", "production"]);

export const EXOTEL_INDIA_API_BASE_URL = "https://api.in.exotel.com";
export const EXOTEL_OTP_PLACEHOLDER = "{{OTP}}";
export const EXOTEL_REQUEST_TIMEOUT_MIN_MS = 1_000;
export const EXOTEL_REQUEST_TIMEOUT_MAX_MS = 10_000;

const exotelStringKeys = [
  "EXOTEL_API_BASE_URL",
  "EXOTEL_API_KEY",
  "EXOTEL_API_TOKEN",
  "EXOTEL_ACCOUNT_SID",
  "EXOTEL_SMS_SENDER_ID",
  "EXOTEL_DLT_ENTITY_ID",
  "EXOTEL_DLT_TEMPLATE_ID",
  "EXOTEL_OTP_BODY_TEMPLATE",
] as const;

const schema = z
  .object({
    APP_ENV: appEnvSchema,
    PORT: z.coerce.number().int().positive().default(3002),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    DATABASE_URL: z.string().url(),
    OTP_PROVIDER: z.enum(["local", "exotel"]),
    OTP_HMAC_SECRET: z.string().min(32),
    JWT_ACCESS_SECRET: z.string().min(32),
    REFRESH_TOKEN_HMAC_SECRET: z.string().min(32),
    ALLOWED_ORIGINS: z.string().min(1),
    ENABLE_OPENAPI: z.enum(["true", "false"]).optional(),
    EXOTEL_API_BASE_URL: z.string().optional(),
    EXOTEL_API_KEY: z.string().optional(),
    EXOTEL_API_TOKEN: z.string().optional(),
    EXOTEL_ACCOUNT_SID: z.string().optional(),
    EXOTEL_SMS_SENDER_ID: z.string().optional(),
    EXOTEL_DLT_ENTITY_ID: z.string().optional(),
    EXOTEL_DLT_TEMPLATE_ID: z.string().optional(),
    EXOTEL_OTP_BODY_TEMPLATE: z.string().optional(),
    EXOTEL_REQUEST_TIMEOUT_MS: z.coerce.number().int().optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.APP_ENV === "staging" || value.APP_ENV === "production") &&
      value.OTP_PROVIDER === "local"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTP_PROVIDER"],
        message:
          "The local OTP provider is forbidden in staging and production",
      });
    }

    if (value.OTP_PROVIDER === "exotel") {
      for (const key of exotelStringKeys) {
        if (trimToUndefined(value[key]) === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when OTP_PROVIDER is exotel`,
          });
        }
      }

      const baseUrl = trimToUndefined(value.EXOTEL_API_BASE_URL);
      if (baseUrl !== undefined && baseUrl !== EXOTEL_INDIA_API_BASE_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_API_BASE_URL"],
          message: `EXOTEL_API_BASE_URL must be the approved India origin ${EXOTEL_INDIA_API_BASE_URL}`,
        });
      }

      const apiKey = trimToUndefined(value.EXOTEL_API_KEY);
      if (apiKey !== undefined && !/^[A-Za-z0-9._-]{1,128}$/u.test(apiKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_API_KEY"],
          message: "EXOTEL_API_KEY has an invalid format",
        });
      }

      const apiToken = trimToUndefined(value.EXOTEL_API_TOKEN);
      if (
        apiToken !== undefined &&
        (apiToken !== value.EXOTEL_API_TOKEN ||
          apiToken.length > 512 ||
          hasControlCharacters(apiToken))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_API_TOKEN"],
          message: "EXOTEL_API_TOKEN has an invalid format",
        });
      }

      const accountSid = trimToUndefined(value.EXOTEL_ACCOUNT_SID);
      if (
        accountSid !== undefined &&
        !/^[A-Za-z0-9_-]{1,128}$/u.test(accountSid)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_ACCOUNT_SID"],
          message: "EXOTEL_ACCOUNT_SID must be a single safe URL segment",
        });
      }

      const senderId = trimToUndefined(value.EXOTEL_SMS_SENDER_ID);
      if (senderId !== undefined && !/^[A-Za-z0-9]{1,11}$/u.test(senderId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_SMS_SENDER_ID"],
          message:
            "EXOTEL_SMS_SENDER_ID must contain 1 to 11 letters or digits",
        });
      }

      for (const key of [
        "EXOTEL_DLT_ENTITY_ID",
        "EXOTEL_DLT_TEMPLATE_ID",
      ] as const) {
        const dltId = trimToUndefined(value[key]);
        if (dltId !== undefined && !/^[0-9]{1,32}$/u.test(dltId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must contain 1 to 32 digits`,
          });
        }
      }

      const template = trimToUndefined(value.EXOTEL_OTP_BODY_TEMPLATE);
      if (template !== undefined) {
        const placeholderCount =
          template.split(EXOTEL_OTP_PLACEHOLDER).length - 1;
        const fixedCopy = template.replace(EXOTEL_OTP_PLACEHOLDER, "");
        if (
          placeholderCount !== 1 ||
          template !== value.EXOTEL_OTP_BODY_TEMPLATE ||
          template.length > 480 ||
          hasControlCharacters(template) ||
          /[\r\n\u2028\u2029]/u.test(template) ||
          /(?:https?:\/\/|www\.)/iu.test(template) ||
          /[{}]/u.test(fixedCopy)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["EXOTEL_OTP_BODY_TEMPLATE"],
            message:
              "EXOTEL_OTP_BODY_TEMPLATE must be one line, contain exactly one {{OTP}} placeholder, contain no URL or extra template marker, and be at most 480 characters",
          });
        }
      }

      const timeout = value.EXOTEL_REQUEST_TIMEOUT_MS;
      if (timeout === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_REQUEST_TIMEOUT_MS"],
          message:
            "EXOTEL_REQUEST_TIMEOUT_MS is required when OTP_PROVIDER is exotel",
        });
      } else if (
        timeout < EXOTEL_REQUEST_TIMEOUT_MIN_MS ||
        timeout > EXOTEL_REQUEST_TIMEOUT_MAX_MS
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EXOTEL_REQUEST_TIMEOUT_MS"],
          message: `EXOTEL_REQUEST_TIMEOUT_MS must be between ${String(EXOTEL_REQUEST_TIMEOUT_MIN_MS)} and ${String(EXOTEL_REQUEST_TIMEOUT_MAX_MS)}`,
        });
      }

      if (isDeployedEnv(value.APP_ENV)) {
        for (const key of exotelStringKeys) {
          const setting = trimToUndefined(value[key]);
          if (setting !== undefined && isPlaceholderValue(setting)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${key} must not use an example or secret-manager placeholder in staging or production`,
            });
          }
        }
      }
    }

    if (isDeployedEnv(value.APP_ENV)) {
      for (const [path, secret] of [
        ["OTP_HMAC_SECRET", value.OTP_HMAC_SECRET],
        ["JWT_ACCESS_SECRET", value.JWT_ACCESS_SECRET],
        ["REFRESH_TOKEN_HMAC_SECRET", value.REFRESH_TOKEN_HMAC_SECRET],
      ] as const) {
        if (isPlaceholderSecret(secret)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [path],
            message: `${path} must not use an example or secret-manager placeholder in staging or production`,
          });
        }
      }

      if (isPlaceholderDatabaseUrl(value.DATABASE_URL)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DATABASE_URL"],
          message:
            "DATABASE_URL must not use template placeholder credentials in staging or production",
        });
      }

      const origins = splitOrigins(value.ALLOWED_ORIGINS);
      if (origins.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ALLOWED_ORIGINS"],
          message: "ALLOWED_ORIGINS must include at least one origin",
        });
      }

      for (const origin of origins) {
        if (origin === "*") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ALLOWED_ORIGINS"],
            message:
              "Wildcard CORS origins are forbidden in staging and production",
          });
          continue;
        }

        const parsed = tryParseOrigin(origin);
        if (parsed === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ALLOWED_ORIGINS"],
            message: "ALLOWED_ORIGINS entries must be absolute origins",
          });
          continue;
        }

        if (value.APP_ENV === "production" && parsed.protocol !== "https:") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ALLOWED_ORIGINS"],
            message: "Production ALLOWED_ORIGINS must use https",
          });
        }

        if (value.APP_ENV === "production" && isLoopbackHost(parsed.hostname)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ALLOWED_ORIGINS"],
            message:
              "Production ALLOWED_ORIGINS must not include loopback hosts",
          });
        }
      }
    }
  });

export type Environment = z.infer<typeof schema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

function isDeployedEnv(
  env: z.infer<typeof appEnvSchema>,
): env is "staging" | "production" {
  return env === "staging" || env === "production";
}

function trimToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function isPlaceholderSecret(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return (
    normalized.includes("INJECT_FROM_SECRET_MANAGER") ||
    normalized.includes("REPLACE-WITH-AT-LEAST-32") ||
    normalized.includes("YOUR-SERVICE-ROLE-KEY") ||
    normalized.includes("YOUR-ANON-KEY") ||
    normalized.includes("YOUR-PROJECT-URL") ||
    normalized === "CHANGEME" ||
    normalized === "SECRET" ||
    normalized === "PASSWORD"
  );
}

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return (
    isPlaceholderSecret(value) ||
    normalized === "PENDING" ||
    normalized === "TBD" ||
    normalized.includes("INJECT_APPROVED_") ||
    normalized.includes("YOUR_API_") ||
    normalized.includes("YOUR_ACCOUNT_") ||
    normalized.includes("YOUR_DLT_") ||
    normalized.includes("YOUR_SENDER_") ||
    normalized.includes("REPLACE_ME") ||
    normalized.includes("CHANGE_ME") ||
    /<[^>]+>/u.test(value)
  );
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function isPlaceholderDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const hostname = url.hostname.toUpperCase();
    return (
      hostname === "HOST" ||
      hostname.endsWith("EXAMPLE.COM") ||
      (username === "USER" && password === "PASSWORD")
    );
  } catch {
    return true;
  }
}

function splitOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function tryParseOrigin(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (url.pathname !== "/" && url.pathname !== "") {
      return undefined;
    }
    if (url.search !== "" || url.hash !== "") {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
