import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const baseURL = process.env.E2E_BASE_URL?.trim() || "http://127.0.0.1:4173";
const frontendCommand =
  process.env.E2E_FRONTEND_COMMAND?.trim() ||
  "npm run dev -- --host 127.0.0.1 --port 4173";
const useExistingFrontend = process.env.E2E_USE_EXISTING_FRONTEND === "1";
const chromiumExecutablePath = [
  process.env.E2E_CHROMIUM_EXECUTABLE_PATH?.trim(),
  `${homedir()}/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome`,
  `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell`,
].find((candidate) => Boolean(candidate) && existsSync(candidate));

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./e2e/test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "./e2e/playwright-report" }],
  ],
  use: {
    baseURL,
    headless: process.env.E2E_HEADED === "1" ? false : true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: chromiumExecutablePath
          ? {
              executablePath: chromiumExecutablePath,
            }
          : undefined,
      },
    },
  ],
  webServer: useExistingFrontend
    ? undefined
    : {
        command: frontendCommand,
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
