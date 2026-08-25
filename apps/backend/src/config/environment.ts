import { z } from "zod";

const appEnvSchema = z.enum(["development", "test", "staging", "production"]);

const schema = z
  .object({
    APP_ENV: appEnvSchema,
    PORT: z.coerce.number().int().positive().default(3002),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    DATABASE_URL: z.string().url(),
    OTP_PROVIDER: z.enum(["local", "external"]),
    OTP_HMAC_SECRET: z.string().min(32),
    JWT_ACCESS_SECRET: z.string().min(32),
    REFRESH_TOKEN_HMAC_SECRET: z.string().min(32),
    ALLOWED_ORIGINS: z.string().min(1),
    SMS_OTP_ENDPOINT: z.string().optional(),
    SMS_OTP_API_KEY: z.string().optional(),
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

    if (value.OTP_PROVIDER === "external") {
      const endpoint = trimToUndefined(value.SMS_OTP_ENDPOINT);
      const apiKey = trimToUndefined(value.SMS_OTP_API_KEY);
      if (endpoint === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMS_OTP_ENDPOINT"],
          message: "SMS_OTP_ENDPOINT is required when OTP_PROVIDER is external",
        });
      } else if (!isHttpUrl(endpoint)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMS_OTP_ENDPOINT"],
          message: "SMS_OTP_ENDPOINT must be an http or https URL",
        });
      } else if (
        isDeployedEnv(value.APP_ENV) &&
        !endpoint.toLowerCase().startsWith("https://")
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMS_OTP_ENDPOINT"],
          message: "SMS_OTP_ENDPOINT must use https in staging and production",
        });
      }

      if (apiKey === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMS_OTP_API_KEY"],
          message: "SMS_OTP_API_KEY is required when OTP_PROVIDER is external",
        });
      } else if (isPlaceholderSecret(apiKey) && isDeployedEnv(value.APP_ENV)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMS_OTP_API_KEY"],
          message:
            "SMS_OTP_API_KEY must not use an example or secret-manager placeholder in staging or production",
        });
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

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
