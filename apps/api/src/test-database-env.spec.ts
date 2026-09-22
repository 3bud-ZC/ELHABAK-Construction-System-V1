import { describe, expect, it } from "vitest";
import { validateTestDatabaseUrl } from "./test-database-env";

const localDsn = (database: string) => `postgresql://test_user:test_password@127.0.0.1:5432/${database}`;

describe("strict test database policy", () => {
  it.each(["elhabak_test", "elhabak_test_7f3a9c"]) ("accepts loopback %s", (database) => {
    expect(() => validateTestDatabaseUrl(localDsn(database))).not.toThrow();
  });

  it.each([
    ["local production database", localDsn("elhabak")],
    ["Neon", "postgresql://test_user:test_password@ep-example.neon.tech:5432/elhabak_test"],
    ["arbitrary remote PostgreSQL", "postgresql://test_user:test_password@192.0.2.10:5432/elhabak_test"],
    ["localhost with wrong database", localDsn("development")],
  ])("rejects %s", (_scenario, dsn) => {
    expect(() => validateTestDatabaseUrl(dsn)).toThrow();
  });

  it("rejects malformed DATABASE_URL without exposing its contents", () => {
    expect(() => validateTestDatabaseUrl("not-a-dsn", "DATABASE_URL")).toThrow(
      /DATABASE_URL is malformed/,
    );
  });

  it("validates DIRECT_DATABASE_URL independently", () => {
    expect(() => validateTestDatabaseUrl(localDsn("elhabak_test"), "DIRECT_DATABASE_URL")).not.toThrow();
    expect(() => validateTestDatabaseUrl(localDsn("elhabak"), "DIRECT_DATABASE_URL")).toThrow(
      /DIRECT_DATABASE_URL/,
    );
  });
});
