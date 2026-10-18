import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PL_PAGES } from "./i18n/pl/pages";

const read = (path: string) => readFileSync(`${import.meta.dirname}/${path}`, "utf8");

// WCAG 2.4.2: each page outside the field log names its own browser tab, not just "Stillwater".
describe("page titles", () => {
  it.each([
    ["pages/Login.tsx", 'usePageTitle(`${t("Sign in")} · Stillwater`);'],
    ["pages/Register.tsx", 'usePageTitle(t("Join Stillwater"));'],
    ["pages/Board.tsx", 'usePageTitle(`${t("Lodge board")} · Stillwater`);'],
    ["pages/Log.tsx", 'usePageTitle(`${me ? t("{name}’s catch log", { name: me.profile.displayName }) : t("Catch log")} · Stillwater`);'],
    ["pages/Dock.tsx", 'usePageTitle(`${t("On the lake")} · Stillwater`);'],
  ])("%s names its tab", (path, call) => {
    expect(read(path)).toContain(call);
  });

  it("has the lake's title in Polish", () => {
    expect(PL_PAGES["On the lake"]).toBe("Nad jeziorem");
  });

  it("puts the app's name back when a page closes", () => {
    expect(read("pageTitle.ts")).toContain('document.title = "Stillwater";');
  });
});
