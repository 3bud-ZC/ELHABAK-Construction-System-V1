import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminClientsController } from "./admin-clients.controller";
import { AdminClientsService } from "./admin-clients.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AuditService } from "./audit.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController, AdminClientsController],
  providers: [AdminUsersService, AdminClientsService, AuditService]
})
export class AdminModule {}
