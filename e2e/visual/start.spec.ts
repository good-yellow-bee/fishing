import { expect, test } from "@playwright/test";
import { prepare } from "./shoot";

// Signed out, as a first-time visitor meets it. No test here submits a form: the API's sign-up limit is live.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("the way in", () => {
  for (const lang of ["en", "pl"] as const) {
    const suffix = lang === "en" ? "" : "-pl";

    test(`the start page signed out (${lang})`, async ({ page }) => {
      await prepare(page, { lang });
      await page.goto("/");
      // The row under Play shows once the sign-in check has answered.
      await page.locator("a[href='/login']").waitFor();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`start${suffix}.png`, { fullPage: true });
    });

    test(`Sign in (${lang})`, async ({ page }) => {
      await prepare(page, { lang });
      await page.goto("/login");
      await page.locator("#password").waitFor();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`login${suffix}.png`, { fullPage: true });
    });

    test(`Create account (${lang})`, async ({ page }) => {
      await prepare(page, { lang });
      await page.goto("/register");
      await page.locator("#password").waitFor();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`register${suffix}.png`, { fullPage: true });
    });
  }
});
