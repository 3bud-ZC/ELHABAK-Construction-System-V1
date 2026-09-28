import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { parseApiEnv } from "@elhabak/config";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { accountTracker, ipTracker, LoginThrottleGuard } from "./login-throttle.guard";
import { RolesGuard } from "./roles.guard";
import { SessionMaintenanceService } from "./session-maintenance.service";

// Evaluated at module load, after dotenv has populated process.env in every bootstrap
// path (same pattern as RealtimeGateway's env read).
const env = parseApiEnv(process.env);

@Module({
  imports: [
    // Storage/options provider for the credential rate limiter only - no global throttle
    // is registered, so ordinary authenticated reads are never rate-limited. Both named
    // throttlers apply to every route guarded by LoginThrottleGuard.
    ThrottlerModule.forRoot([
      { name: "account", ttl: 60_000, limit: env.AUTH_LOGIN_RATE_LIMIT, getTracker: accountTracker },
      { name: "ip", ttl: 60_000, limit: env.AUTH_LOGIN_IP_RATE_LIMIT, getTracker: ipTracker }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, LoginThrottleGuard, SessionMaintenanceService],
  exports: [AuthService, AuthGuard, RolesGuard]
})
export class AuthModule {}
