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
