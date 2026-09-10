import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationService } from "./notification.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService]
})
export class NotificationsModule {}
