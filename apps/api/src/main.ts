import "reflect-metadata";
import { config } from "dotenv";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { parseApiEnv } from "@elhabak/config";
import { AppModule } from "./modules/app.module";
import { ApiExceptionFilter } from "./shared/api-exception.filter";

async function bootstrap() {
  config({ quiet: true });
  const env = parseApiEnv(process.env);
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: env.WEB_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  });
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
