import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminClientsController } from "./admin-clients.controller";
import { AdminDeletionController } from "./admin-deletion.controller";
import { AdminClientsService } from "./admin-clients.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AuditService } from "./audit.service";
import { PermanentDeletionService } from "./permanent-deletion.service";
import { StorageService } from "../projects/storage.service";
import { SystemController } from "./system.controller";
import { SystemService } from "./system.service";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [AdminUsersController, AdminClientsController, AdminDeletionController, SystemController],
  providers: [AdminUsersService, AdminClientsService, AuditService, PermanentDeletionService, StorageService, SystemService]
})
export class AdminModule {}
