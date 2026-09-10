import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { serialize } from "cookie";
import { loginSchema } from "@elhabak/validation";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AuthenticatedRequest, RequestUser } from "../../shared/http.types";
import { parseBody } from "../../shared/zod";
import type { AuthResponse } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Promise<AuthResponse> {
    const input = parseBody(loginSchema, body);
    const { token, user } = await this.authService.login(input.email, input.password);
    const cookie = this.sessionCookie(token);

    response.setHeader("Set-Cookie", cookie);
    return { user };
  }

  @UseGuards(AuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ ok: true }> {
    await this.authService.logout(request.sessionId);
    response.setHeader("Set-Cookie", this.clearSessionCookie());
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get("me")
  me(@CurrentUser() user: RequestUser): AuthResponse {
    return { user };
  }

  private sessionCookie(token: string): string {
    const options = this.authService.cookieOptions;

    return serialize(options.name, token, {
      httpOnly: true,
      sameSite: options.sameSite,
      secure: options.secure,
      path: "/",
      maxAge: options.maxAge
    });
  }

  private clearSessionCookie(): string {
    const options = this.authService.cookieOptions;

    return serialize(options.name, "", {
      httpOnly: true,
      sameSite: options.sameSite,
      secure: options.secure,
      path: "/",
      maxAge: 0
    });
  }
}
