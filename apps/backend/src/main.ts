import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/http/global-exception.filter";
import { configureHttpSurface } from "./common/http/http-surface";
import type { Environment } from "./config/environment";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  configureHttpSurface(app, {
    appEnv: config.getOrThrow<Environment["APP_ENV"]>("APP_ENV"),
    allowedOrigins: config.getOrThrow<string>("ALLOWED_ORIGINS"),
    enableOpenApiOverride: config.get<string>("ENABLE_OPENAPI") === "true",
  });

  const port = config.getOrThrow<number>("PORT");
  await app.listen(port, "0.0.0.0");
  Logger.log(`Backend listening on port ${String(port)}`, "Bootstrap");
}

void bootstrap();
