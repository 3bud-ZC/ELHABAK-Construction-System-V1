import { config } from "dotenv";
import { resolve } from "node:path";

export const TEST_DATABASE_NAMES = ["elhabak_test"] as const;
export const TEST_DATABASE_PREFIX = "elhabak_test_";

function isLoopbackHost(hostname: string): boolean {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname.toLowerCase());
}

function safeDatabaseName(url: URL): string {
  try {
    return decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    return "<malformed>";
  }
}

export function validateTestDatabaseUrl(configuredUrl: string, variableName = "DATABASE_URL"): URL {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(configuredUrl);
  } catch {
    throw new Error(`Refusing to run tests: ${variableName} is malformed. Expected a local PostgreSQL test DSN.`);
  }

  const host = databaseUrl.hostname || "<missing>";
  const database = safeDatabaseName(databaseUrl);
  const isPostgres = databaseUrl.protocol === "postgres:" || databaseUrl.protocol === "postgresql:";
  const isAllowedDatabase = database === "elhabak_test" || database.startsWith(TEST_DATABASE_PREFIX);

  if (!isPostgres || !isLoopbackHost(host) || !isAllowedDatabase) {
    const hostCategory = isLoopbackHost(host) ? "loopback" : "remote or invalid";
    throw new Error(
      `Refusing to run tests: ${variableName} targets ${hostCategory} host and database ${database || "<missing>"}. ` +
        "Tests require PostgreSQL on localhost, 127.0.0.1, or ::1 with database elhabak_test or elhabak_test_*.",
    );
  }

  return databaseUrl;
}

function addTestConnectionOptions(databaseUrl: URL): URL {
  if (!databaseUrl.searchParams.has("connect_timeout")) databaseUrl.searchParams.set("connect_timeout", "30");
  if (!databaseUrl.searchParams.has("pool_timeout")) databaseUrl.searchParams.set("pool_timeout", "60");
  if (!databaseUrl.searchParams.has("connection_limit")) databaseUrl.searchParams.set("connection_limit", "5");
  return databaseUrl;
}

config({ path: resolve(__dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL is missing. Configure a loopback PostgreSQL test database named elhabak_test or elhabak_test_*.",
  );
}

process.env.DATABASE_URL = addTestConnectionOptions(validateTestDatabaseUrl(databaseUrl, "DATABASE_URL")).toString();

if (directDatabaseUrl) {
  process.env.DIRECT_DATABASE_URL = addTestConnectionOptions(
    validateTestDatabaseUrl(directDatabaseUrl, "DIRECT_DATABASE_URL"),
  ).toString();
}

// Suites log in repeatedly within seconds; the production brute-force ceiling (8/min)
// would flake them, so specs run with a high limit unless a spec pins its own value
// before importing AppModule (the security-hardening spec does exactly that).
process.env.AUTH_LOGIN_RATE_LIMIT ??= "1000";
