import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PL_GAME as pl } from "../i18n/pl/game";

const dock = readFileSync(`${import.meta.dirname}/Dock.tsx`, "utf8");
const css = readFileSync(`${import.meta.dirname}/../index.css`, "utf8");

describe("the lake's controls strip", () => {
  it("lists the arrow keys for aiming on a desktop, in English and Polish", () => {
    expect(dock).toContain('<kbd>{t("Click water")}</kbd> {t("or")} <kbd>{t("Arrows")}</kbd> {t("aim")}');
    expect(pl.Arrows).toBe("Strzałki");
  });

  it("keeps each key on one line and tightens between the phone layout and a wide window", () => {
    expect(css).toContain(".camera-help kbd {\n  white-space: nowrap;\n}");
    expect(css).toMatch(/@media \(min-width: 801px\) and \(max-width: 960px\) \{\s+\.camera-help \{\s+gap: 5px;\s+\}\s+\.camera-help > span:first-child \{\s+display: none;/);
  });
});
