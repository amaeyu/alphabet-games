import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173/alphabet-games/";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.js",
  use: { baseURL, screenshot: "only-on-failure" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --strictPort",
    url: baseURL,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "ipad-webkit", use: { ...devices["iPad (gen 7)"] } },
  ],
});
