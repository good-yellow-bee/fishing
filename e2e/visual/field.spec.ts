import { expect, test, type Page } from "@playwright/test";
import { prepare } from "./shoot";

/** Opens a field log page with the sample book and waits for `heading`. */
async function openField(page: Page, path: string, heading: RegExp, lang: "en" | "pl" = "en") {
  await prepare(page, { lang });
  await page.goto(path);
  await page.getByRole("heading", { name: heading }).first().waitFor();
  await page.waitForLoadState("networkidle");
}

test.describe("the field log", () => {
  test("Home", async ({ page }) => {
    await openField(page, "/book", /.+/);
    await expect(page).toHaveScreenshot("home.png", { fullPage: true });
  });

  test("a catch page", async ({ page }) => {
    await openField(page, "/catches", /.+/);
    await page.locator("a[href^='/catches/']:not([href$='/new'])").first().click();
    await page.getByRole("heading").first().waitFor();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("catch.png", { fullPage: true });
  });

  test("Home in Polish", async ({ page }) => {
    await openField(page, "/book", /.+/, "pl");
    await expect(page).toHaveScreenshot("home-pl.png", { fullPage: true });
  });
});
