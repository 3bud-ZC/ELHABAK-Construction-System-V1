import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { parseApiEnv } from "@elhabak/config";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { LoginThrottleGuard } from "./login-throttle.guard";
import { RolesGuard } from "./roles.guard";

// Evaluated at module load, after dotenv has populated process.env in every bootstrap
// path (same pattern as RealtimeGateway's env read).
const env = parseApiEnv(process.env);

@Module({
  imports: [
    // Storage/options provider for the login rate limiter only - no global throttle is
    // registered, so ordinary authenticated reads are never rate-limited.
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: env.AUTH_LOGIN_RATE_LIMIT }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, LoginThrottleGuard],
  exports: [AuthService, AuthGuard, RolesGuard]
})
export class AuthModule {}
