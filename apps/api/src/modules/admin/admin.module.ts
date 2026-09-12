import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminClientsController } from "./admin-clients.controller";
import { AdminClientsService } from "./admin-clients.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AuditService } from "./audit.service";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [AdminUsersController, AdminClientsController],
  providers: [AdminUsersService, AdminClientsService, AuditService]
})
export class AdminModule {}
