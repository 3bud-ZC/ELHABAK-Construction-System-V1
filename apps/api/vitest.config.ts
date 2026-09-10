import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
    setupFiles: ["./src/test-database-env.ts"],
    fileParallelism: false,
    testTimeout: 300000,
    hookTimeout: 300000,
    sequence: {
      concurrent: false
    }
  }
});
