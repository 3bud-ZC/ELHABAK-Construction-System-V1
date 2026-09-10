import { Module } from "@nestjs/common";
import { AuditService } from "../admin/audit.service";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { StorageService } from "../projects/storage.service";
import { ChatAccessService } from "./chat-access.service";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [AuthModule, ProjectsModule, NotificationsModule, RealtimeModule],
  controllers: [ChatController],
  providers: [AuditService, StorageService, ChatAccessService, ChatService]
})
export class ChatModule {}
