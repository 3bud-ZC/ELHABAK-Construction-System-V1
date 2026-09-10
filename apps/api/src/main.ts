import "reflect-metadata";
import { config } from "dotenv";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { parseApiEnv } from "@elhabak/config";
import { ApiExceptionFilter } from "./shared/api-exception.filter";

async function bootstrap() {
  config({ quiet: true });
  const env = parseApiEnv(process.env);
  // AppModule is imported dynamically, after dotenv has populated process.env: a static
  // top-level import would be require()'d (and its whole provider graph evaluated) before
  // this function body ever runs, which broke RealtimeGateway's module-load-time env read.
  const { AppModule } = await import("./modules/app.module");
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: env.WEB_ORIGIN,
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

  await app.listen(env.API_PORT);
}

void bootstrap();
