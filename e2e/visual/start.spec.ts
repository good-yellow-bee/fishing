import { expect, test } from "@playwright/test";
import { prepare } from "./shoot";

// Signed out, as a first-time visitor meets it.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("the start page", () => {
  for (const lang of ["en", "pl"] as const) {
    test(`signed out (${lang})`, async ({ page }) => {
      await prepare(page, { lang });
      await page.goto("/");
      // The row under Play shows once the sign-in check has answered.
      await page.locator("a[href='/login']").waitFor();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(lang === "en" ? "start.png" : "start-pl.png", { fullPage: true });
    });
  }
});
