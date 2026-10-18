import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hud = readFileSync(`${import.meta.dirname}/Hud.tsx`, "utf8");

describe("the lake page's heading", () => {
  it("gives a screen reader one level-one heading to jump to, hidden from the eye", () => {
    expect(hud).toContain('<h1 className="sr-only">{t("On the lake")}</h1>');
  });
});
