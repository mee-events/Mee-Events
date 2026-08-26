import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/integration/**/*.integration.spec.ts"],
    globalSetup: ["test/integration/support/global-setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    teardownTimeout: 10_000,
  },
});
