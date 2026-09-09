import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ProjectPhase, ProjectStatus } from "@elhabak/database";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../../shared/http.types";
import { ProjectsService } from "./projects.service";

@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/projects")
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Query("search") search?: string, @Query("status") status?: ProjectStatus, @Query("phase") phase?: ProjectPhase) {
    return this.projectsService.adminList(search, status, phase);
  }

  @Get("dashboard/summary")
  dashboard() {
    return this.projectsService.dashboard();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projectsService.get(id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.projectsService.create(user.id, body);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.projectsService.update(user.id, id, body);
  }
}
