import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../../shared/http.types";
import { AdminClientsService } from "./admin-clients.service";
import { parsePageRequest } from "../../shared/paging";

@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/clients")
export class AdminClientsController {
  constructor(private readonly clientsService: AdminClientsService) {}

  @Get()
  list(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string
  ) {
    const filter = status === "ACTIVE" || status === "INACTIVE" ? status : undefined;
    return this.clientsService.list(search, parsePageRequest(page, pageSize), filter);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.clientsService.get(id);
  }

  // Responses carrying a one-time plaintext credential must never be cached.
  @Post()
  @Header("Cache-Control", "no-store")
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.clientsService.create(user.id, body);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.clientsService.update(user.id, id, body);
  }

  @Post(":id/reset-password")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  resetPassword(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.clientsService.resetPassword(user.id, id);
  }
}
