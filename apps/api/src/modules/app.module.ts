import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseApiEnv } from "@elhabak/config";
import { DatabaseModule } from "../shared/database.module";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: parseApiEnv
    }),
    DatabaseModule,
    AuthModule,
    AdminModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
