import { defineConfig } from "@playwright/test";
import { STATE_FILE } from "./paths";

const port = Number(process.env.VISUAL_PORT ?? 4183);
const baseURL = `http://localhost:${port}`;

/**
 * Screenshot tests of the lake and the field log (README "Visual tests"). Baselines are Linux PNGs made in CI's
 * Playwright container, so other systems run the flows without comparing unless VISUAL_COMPARE=1.
 */
export default defineConfig({
  testDir: ".",
  globalSetup: "./setup.ts",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}",
  ignoreSnapshots: process.platform !== "linux" && !process.env.VISUAL_COMPARE,
  outputDir: "../../test-results/visual",
  timeout: 120_000,
  workers: process.env.CI ? 2 : 1,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "../../test-results/visual-report" }]] : "list",
  expect: {
    // The software renderer takes a few seconds per capture, and a new baseline needs two that match.
    timeout: 30_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled", caret: "hide", scale: "css" },
  },
  use: {
    baseURL,
    storageState: STATE_FILE,
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 1,
    timezoneId: "UTC",
    locale: "en-US",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: {
    command: "bash e2e/visual/serve.sh",
    cwd: "../..",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "pipe",
  },
});
