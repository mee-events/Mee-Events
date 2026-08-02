import { z } from "zod";

const schema = z
  .object({
    APP_ENV: z.enum(["development", "test", "staging", "production"]),
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
  })
  .superRefine((value, context) => {
    if (value.APP_ENV === "production" && value.OTP_PROVIDER === "local") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTP_PROVIDER"],
        message: "The local OTP provider is forbidden in production",
      });
    }
  });

export type Environment = z.infer<typeof schema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${result.error.message}`,
    );
  }
  return result.data;
}
