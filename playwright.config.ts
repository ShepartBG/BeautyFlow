import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(baseURL);

export default defineConfig({
  testDir: "./tests",
  timeout: 35_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: isLocal
    ? {
        command: "npm run dev",
        env: { ...process.env, BEAUTYFLOW_E2E_MODE: "1" },
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
});
