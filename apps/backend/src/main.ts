import "reflect-metadata";
import { Logger, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/http/global-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.setGlobalPrefix("api");

  const config = app.get(ConfigService);
  const configuredOrigins = config
    .getOrThrow<string>("ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const isDevelopment = config.getOrThrow<string>("APP_ENV") === "development";

  // Mobile/desktop clients send no Origin. Flutter Web uses a random localhost
  // port in development, so allow any localhost/127.0.0.1 origin there.
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (origin === undefined || origin.length === 0) {
        callback(null, true);
        return;
      }
      if (configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (
        isDevelopment &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  const openApi = new DocumentBuilder()
    .setTitle("ME Event Platform API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, openApi),
  );

  const port = config.getOrThrow<number>("PORT");
  await app.listen(port, "0.0.0.0");
  Logger.log(`Backend listening on port ${String(port)}`, "Bootstrap");
}

void bootstrap();
