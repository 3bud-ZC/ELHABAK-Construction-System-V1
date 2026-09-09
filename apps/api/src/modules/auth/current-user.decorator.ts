import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, RequestUser } from "../../shared/http.types";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

  if (!request.user) {
    throw new Error("CurrentUser used without AuthGuard.");
  }

  return request.user;
});
