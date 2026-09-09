import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { parse } from "cookie";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "../../shared/http.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = parse(request.headers.cookie ?? "");
    const token = cookies[this.authService.cookieOptions.name];
    const auth = await this.authService.authenticate(token);

    request.user = auth.user;
    request.sessionId = auth.sessionId;
    return true;
  }
}
