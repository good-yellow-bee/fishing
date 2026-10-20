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
  await page.locator(".scene-wrap canvas").waitFor({ timeout: 90_000 });
  // Scene parts out at the start hold the reveal until they are in, so once the network settles the lake is whole.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => new Promise<void>((resolve) => {
    let left = 12;
    const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }));
  for (const key of options.keys ?? []) await page.keyboard.press(key);
  await page.evaluate(async (frames) => {
    const shot = (window as unknown as { __shot: { start(): void; step(n: number): Promise<void> } }).__shot;
    shot.start();
    await shot.step(frames);
  }, frames);
}

/** The lake's passing words (hints and toasts) come and go on their own timers; the shots leave them out. */
export const lakeMasks = (page: Page) => [page.locator(".hint"), page.locator(".toast")];
