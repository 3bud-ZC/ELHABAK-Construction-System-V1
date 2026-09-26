import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { parse } from "cookie";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "../../shared/http.types";

/**
 * Accounts provisioned with a temporary password may authenticate, but the session is
 * confined to the credentials lifecycle until the password is replaced: session probe,
 * password change, logout, and impersonation exit. Every other API surface is denied
 * with 403.
 */
const PASSWORD_CHANGE_ALLOWLIST = new Set([
  "/auth/me",
  "/auth/password/change",
  "/auth/logout",
  "/auth/impersonation/exit"
]);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = parse(request.headers.cookie ?? "");
    const token = cookies[this.authService.cookieOptions.name];
    const auth = await this.authService.authenticate(token);

    if (auth.user.mustChangePassword && !PASSWORD_CHANGE_ALLOWLIST.has(request.path)) {
      throw new ForbiddenException("Password change required before continuing.");
    }

    request.user = auth.user;
    request.sessionId = auth.sessionId;
    return true;
  }
}
