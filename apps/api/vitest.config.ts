import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
    setupFiles: ["./src/test-database-env.ts"],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
    sequence: {
      concurrent: false
    }
  }
});
