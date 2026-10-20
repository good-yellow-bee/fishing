import { expect, test } from "@playwright/test";
import { lakeMasks, openLake } from "./shoot";

test.describe("the lake", () => {
  test("summer day at the dock", async ({ page }) => {
    await openLake(page, "?hour=day&sky=clear&season=summer&moon=0.5");
    await expect(page).toHaveScreenshot("dock-summer-day.png", { mask: lakeMasks(page) });
  });

  test("clear night with the headlamp on", async ({ page }) => {
    await openLake(page, "?hour=night&sky=clear&season=summer&moon=0.7", { keys: ["l"] });
    await expect(page).toHaveScreenshot("dock-night-headlamp.png", { mask: lakeMasks(page) });
  });

  test("fog", async ({ page }) => {
    await openLake(page, "?hour=day&sky=fog&season=fall&moon=0.5");
    await expect(page).toHaveScreenshot("dock-fog.png", { mask: lakeMasks(page) });
  });

  test("spring rain", async ({ page }) => {
    await openLake(page, "?hour=day&sky=rain&season=spring&moon=0.5");
    await expect(page).toHaveScreenshot("dock-rain.png", { mask: lakeMasks(page) });
  });

  test("winter snow", async ({ page }) => {
    await openLake(page, "?hour=day&sky=rain&season=winter&moon=0.5");
    await expect(page).toHaveScreenshot("dock-winter-snow.png", { mask: lakeMasks(page) });
  });

  test("clear dawn with long shadows", async ({ page }) => {
    await openLake(page, "?hour=dawn&sky=clear&season=summer&moon=0.5");
    await expect(page).toHaveScreenshot("dock-dawn.png", { mask: lakeMasks(page) });
  });

  test("a phone held upright", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openLake(page, "?hour=day&sky=clear&season=summer&moon=0.5");
    await expect(page).toHaveScreenshot("phone-upright.png", { mask: lakeMasks(page) });
  });

  test("a phone held sideways", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openLake(page, "?hour=day&sky=clear&season=summer&moon=0.5");
    await expect(page).toHaveScreenshot("phone-sideways.png", { mask: lakeMasks(page) });
  });
});
