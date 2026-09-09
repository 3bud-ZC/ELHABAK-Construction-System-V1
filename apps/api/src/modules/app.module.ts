import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseApiEnv } from "@elhabak/config";
import { DatabaseModule } from "../shared/database.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: parseApiEnv
    }),
    DatabaseModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
