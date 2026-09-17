import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

const configuredUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (configuredUrl) {
  const testDatabaseUrl = new URL(configuredUrl);
  if (!testDatabaseUrl.searchParams.has("connect_timeout")) testDatabaseUrl.searchParams.set("connect_timeout", "30");
  if (!testDatabaseUrl.searchParams.has("pool_timeout")) testDatabaseUrl.searchParams.set("pool_timeout", "60");
  if (!testDatabaseUrl.searchParams.has("connection_limit")) testDatabaseUrl.searchParams.set("connection_limit", "5");
  process.env.DATABASE_URL = testDatabaseUrl.toString();
}

// Suites log in repeatedly within seconds; the production brute-force ceiling (8/min)
// would flake them, so specs run with a high limit unless a spec pins its own value
// before importing AppModule (the security-hardening spec does exactly that).
process.env.AUTH_LOGIN_RATE_LIMIT ??= "1000";
