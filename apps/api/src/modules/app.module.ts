import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseApiEnv } from "@elhabak/config";
import { DatabaseModule } from "../shared/database.module";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { ProjectsModule } from "./projects/projects.module";
import { DesignsModule } from "./designs/designs.module";
import { FinanceModule } from "./finance/finance.module";
import { DocumentsModule } from "./documents/documents.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ChatModule } from "./chat/chat.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: parseApiEnv
    }),
    DatabaseModule,
    AuthModule,
    AdminModule,
    RealtimeModule,
    NotificationsModule,
    ProjectsModule,
    DesignsModule,
    FinanceModule,
    DocumentsModule,
    ChatModule,
    ReportsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
