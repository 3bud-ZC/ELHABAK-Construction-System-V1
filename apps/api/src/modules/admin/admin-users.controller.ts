import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { UserRole } from "@elhabak/database";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../../shared/http.types";
import { AdminUsersService } from "./admin-users.service";

@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  list(@Query("search") search?: string, @Query("role") role?: UserRole) {
    return this.usersService.list(search, role);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.usersService.get(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.usersService.create(user.id, body);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.usersService.update(user.id, id, body);
  }
}
