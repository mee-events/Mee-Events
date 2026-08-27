import { defineConfig, devices } from "@playwright/test";
import { assertLoopbackHttpUrl } from "./e2e/loopback";

const apiBase = assertLoopbackHttpUrl(
  "E2E_API_BASE_URL",
  process.env.E2E_API_BASE_URL,
);
const erpBase = assertLoopbackHttpUrl(
  "E2E_ERP_BASE_URL",
  process.env.E2E_ERP_BASE_URL,
);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.smoke.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  forbidOnly: true,
  use: {
    baseURL: erpBase,
    headless: true,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "corepack pnpm dev",
    url: erpBase,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_API_BASE_URL: apiBase,
    },
  },
});
