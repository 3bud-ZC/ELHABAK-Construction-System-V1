import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemService } from "./system.service";

@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get("storage")
  storage() {
    return this.systemService.storageUsage();
  }
}
