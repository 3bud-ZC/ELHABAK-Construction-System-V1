import { Body, Controller, Delete, Get, Header, HttpCode, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../../shared/http.types";
import { PermanentDeletionService } from "./permanent-deletion.service";

/**
 * Permanent (hard) deletion - ADMIN only, re-authorized server-side on every call by the
 * class-level guards. The impact preflight is read-only; the destructive DELETE requires a
 * typed confirmation phrase in the body. No request field can name a filesystem path.
 */
@UseGuards(AuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminDeletionController {
  constructor(private readonly deletion: PermanentDeletionService) {}

  @Get("projects/:id/deletion-impact")
  @Header("Cache-Control", "no-store")
  projectImpact(@Param("id") id: string) {
    return this.deletion.projectImpact(id);
  }

  @Delete("projects/:id")
  @HttpCode(200)
  deleteProject(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.deletion.deleteProject(user.impersonation?.actorId ?? user.id, id, body);
  }

  @Get("clients/:id/deletion-impact")
  @Header("Cache-Control", "no-store")
  clientImpact(@Param("id") id: string) {
    return this.deletion.clientImpact(id);
  }

  @Delete("clients/:id")
  @HttpCode(200)
  deleteClient(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: unknown) {
    return this.deletion.deleteClient(user.impersonation?.actorId ?? user.id, id, body);
  }
}
