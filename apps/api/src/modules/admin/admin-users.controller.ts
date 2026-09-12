import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { UserRole } from "@elhabak/database";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { AuthenticatedRequest, RequestUser } from "../../shared/http.types";
import { AdminUsersService } from "./admin-users.service";

@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  list(
    @Query("search") search?: string,
    @Query("role") role?: UserRole,
    @Query("status") status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
  ) {
    return this.usersService.list(search, role, status);
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

  @Post(":id/activate")
  @HttpCode(200)
  activate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.activate(user.id, id);
  }

  @Post(":id/suspend")
  @HttpCode(200)
  suspend(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.suspend(user.id, id);
  }

  @Post(":id/archive")
  @HttpCode(200)
  archive(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.archive(user.id, id);
  }

  @Post(":id/restore")
  @HttpCode(200)
  restore(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.restore(user.id, id);
  }

  @Post(":id/reset-password")
  @HttpCode(200)
  resetPassword(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.usersService.resetPassword(user.id, id, body);
  }

  @Get(":id/deletion-impact")
  deletionImpact(@Param("id") id: string) {
    return this.usersService.deletionImpact(id);
  }

  @Delete(":id")
  permanentlyDelete(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.permanentlyDelete(user.id, id);
  }

  @Post(":id/impersonate")
  @HttpCode(200)
  impersonate(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.usersService.impersonate(request.sessionId, id);
  }
}
