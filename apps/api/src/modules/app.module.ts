import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { parseApiEnv } from "@elhabak/config";
import { DatabaseModule } from "../shared/database.module";
import { OriginGuard } from "../shared/origin.guard";
import { RequestContextMiddleware } from "../shared/request-context.middleware";
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
  controllers: [HealthController],
  providers: [
    // Runs before any route-level guard, so a forged cross-site mutation is rejected
    // without consuming auth checks or the login throttle budget.
    { provide: APP_GUARD, useClass: OriginGuard }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
