import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../../shared/http.types";
import { AdminClientsService } from "./admin-clients.service";

@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/clients")
export class AdminClientsController {
  constructor(private readonly clientsService: AdminClientsService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.clientsService.list(search);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.clientsService.get(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.clientsService.create(user.id, body);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.clientsService.update(user.id, id, body);
  }
}
