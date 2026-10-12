import { defineConfig } from "@playwright/test";

// Full system test (npm run test:full-system). Starts its own local server on a separate port with
// real email sending (Resend) and the E2E shortcuts switched off, so every flow runs like production.
const PORT = 3210;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: /full-system\.spec\.ts/,
  timeout: 55 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "full-system-report/playwright", open: "never" }]],
  use: {
    baseURL,
    locale: "bg-BG",
    timezoneId: "Europe/Sofia",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  outputDir: "full-system-report/artifacts",
  webServer: {
    command: `node node_modules/next/dist/bin/next dev -p ${PORT} -H 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    // Real environment values win over .env.development.local (which disables email for plain `npm run dev`).
    env: { ...(process.env as Record<string, string>), BEAUTYFLOW_E2E_MODE: "0" },
  },
});
