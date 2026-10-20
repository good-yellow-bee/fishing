import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { sampleLogbook } from "../../packages/shared/src/logbook";
import { freezeTime } from "./freeze";
import { ANGLER_FILE } from "./paths";

/** The moment every shot shows: a Wednesday noon in July, in UTC (the config's timezone). */
export const FIXED_AT = Date.UTC(2026, 6, 15, 12, 0, 0);

/** Settings each shot starts from: full effects that never step down on the software renderer's slow frames. */
const SETTINGS = { autoEffects: false, particles: "full", shadows: true, sharpness: "fast", frameRate: "smooth", reduceMotion: false };

/** The lodge's answers that follow the server's own week (giants, banks, lost trophies), fixed to an empty week. */
const LODGE: Record<string, unknown> = {
  giants: { giants: [] },
  "bank-week": { counts: {} },
  lost: { lost: [], mineFound: [] },
  released: { released: [] },
  recent: { tracks: [] },
};

type ShotOptions = { lang?: "en" | "pl"; keys?: string[] };

/** Freezes time, seeds the browser's storage and fixes the lodge's weekly answers, before the page loads. */
export async function prepare(page: Page, { lang = "en" }: ShotOptions = {}) {
  const { userId } = JSON.parse(readFileSync(ANGLER_FILE, "utf8")) as { userId: string };
  await page.addInitScript(freezeTime, FIXED_AT);
  await page.addInitScript(
    ({ userId, lang, settings, book }) => {
      localStorage.setItem("stillwater.settings.v1", JSON.stringify(settings));
      localStorage.setItem(`stillwater.walkthrough.${userId}.v1`, "done");
      localStorage.setItem("stillwater.lang.v1", lang);
      localStorage.setItem("stillwater.field-log.v1", JSON.stringify(book));
    },
    { userId, lang, settings: SETTINGS, book: sampleLogbook(new Date(FIXED_AT)) },
  );
  // Fonts and anything else off this machine: the app draws in its fallback fonts, the same on every run.
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  await page.route(/\/api\/lodge\/([a-z-]+)$/, (route) => {
    const name = /\/api\/lodge\/([a-z-]+)$/.exec(route.request().url())![1]!;
    return route.request().method() === "GET" && name in LODGE ? route.fulfill({ json: LODGE[name] }) : route.continue();
  });
}

/**
 * Opens the lake at `query`, lets it load with time standing still, presses any `keys`, then draws `frames`
 * frames 1/60 s apart. What shows is the same on every run.
 */
export async function openLake(page: Page, query: string, { frames = 4, ...options }: ShotOptions & { frames?: number } = {}) {
  await prepare(page, options);
  await page.goto(`/play${query}`);
  // Set once the scene's models are in and its shaders compiled (FishingWorld Precompile).
  await page.locator(".scene-wrap canvas[data-ready]").waitFor({ timeout: 90_000 });
  // From here frames are drawn only when the test steps them, so the waits below spend no time rendering.
  await page.evaluate(() => (window as unknown as { __shot: { hold(): void } }).__shot.hold());
  // The game's start-up timers (the angler taking up the rod, the first hints) run on the real clock: let them fire.
  await page.waitForTimeout(6000);
  await page.waitForLoadState("networkidle");
  for (const key of options.keys ?? []) await page.keyboard.press(key);
  await page.evaluate((frames) => (window as unknown as { __shot: { step(n: number): Promise<void> } }).__shot.step(frames), frames);
}

/** The lake's passing words (hints and toasts) come and go on their own timers; the shots leave them out. */
export const lakeMasks = (page: Page) => [page.locator(".hint"), page.locator(".toast")];
