import "reflect-metadata";
import { config } from "dotenv";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { parseApiEnv } from "@elhabak/config";
import { ApiExceptionFilter } from "./shared/api-exception.filter";

// Entry point for ELHABAK API - includes mobile authentication normalization
async function bootstrap() {
  config({ quiet: true });
  const env = parseApiEnv(process.env);
  // AppModule is imported dynamically, after dotenv has populated process.env: a static
  // top-level import would be require()'d (and its whole provider graph evaluated) before
  // this function body ever runs, which broke RealtimeGateway's module-load-time env read.
  const { AppModule } = await import("./modules/app.module");
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const trustedOrigins = [env.WEB_ORIGIN, ...env.EXTRA_WEB_ORIGINS];
  app.enableCors({
    origin: trustedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const expressApp = app.getHttpAdapter().getInstance() as { set?: (key: string, value: unknown) => void };
  if (typeof expressApp?.set === "function") {
    expressApp.set("trust proxy", 1);
  }

  // Railway (and most PaaS hosts) assign the listen port via PORT at runtime; API_PORT
  // remains the local-dev default when PORT is not set. The server must bind 0.0.0.0, not
  // the Express/Nest default of localhost-only, or the platform's health check can't reach it.
  const port = env.PORT ?? env.API_PORT ?? 4000;
  await app.listen(port, "0.0.0.0");
}

/**
 * Process-level safety net. Node 22 terminates on an unhandled promise rejection, so one
 * stray rejected promise (an async event handler, a fire-and-forget notification) would
 * take down every user's session. Rejections are logged loudly with their stack and the
 * process keeps serving. A synchronous uncaught exception can leave shared state
 * inconsistent, so it is logged and the process exits for PM2 to restart it cleanly.
 */
const processLogger = new Logger("Process");
process.on("unhandledRejection", (reason) => {
  processLogger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
});
process.on("uncaughtException", (error) => {
  processLogger.error(`Uncaught exception, exiting for a clean restart: ${error.stack ?? String(error)}`);
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 200).unref();
});

void bootstrap();
