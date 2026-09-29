import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../../shared/http.types";
import { ExecutionService } from "./execution.service";

/** Execution work packages of one project. Role rules live in ExecutionService. */
@UseGuards(AuthGuard)
@Controller("projects/:projectId/execution")
export class ExecutionController {
  constructor(private readonly execution: ExecutionService) {}

  @Get()
  get(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.execution.getExecution(user, projectId);
  }

  @Post("stages")
  create(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.execution.createStage(user, projectId, body);
  }

  @Put("stages/order")
  reorder(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() body: unknown) {
    return this.execution.reorderStages(user, projectId, body);
  }

  @Get("stages/:stageId")
  getStage(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("stageId") stageId: string) {
    return this.execution.getStage(user, projectId, stageId);
  }

  @Patch("stages/:stageId")
  update(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("stageId") stageId: string, @Body() body: unknown) {
    return this.execution.updateStage(user, projectId, stageId, body);
  }

  @Put("stages/:stageId/team")
  setTeam(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("stageId") stageId: string, @Body() body: unknown) {
    return this.execution.setStageTeam(user, projectId, stageId, body);
  }

  @Delete("stages/:stageId")
  remove(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("stageId") stageId: string) {
    return this.execution.deleteStage(user, projectId, stageId);
  }
}
