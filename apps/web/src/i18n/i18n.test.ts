// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectLang, getLang, LANG_KEY, num, reloadLang, setLang, t, tn } from ".";
import { PL } from "./pl";

const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());

beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  reloadLang();
});

describe("language", () => {
  it("goes by the first browser language it speaks", () => {
    expect(detectLang(["pl-PL", "en-US"])).toBe("pl");
    expect(detectLang(["pl"])).toBe("pl");
    expect(detectLang(["de-DE", "pl-PL"])).toBe("pl");
    expect(detectLang(["en-GB", "pl-PL"])).toBe("en");
    expect(detectLang(["de-DE"])).toBe("en");
    expect(detectLang([])).toBe("en");
  });

  it("remembers a choice over the browser and marks the page", () => {
    setLang("pl");
    expect(localStorage.getItem(LANG_KEY)).toBe("pl");
    expect(document.documentElement.lang).toBe("pl");
    reloadLang();
    expect(getLang()).toBe("pl");
    localStorage.setItem(LANG_KEY, "klingon");
    reloadLang();
    expect(getLang()).toBe("en");
  });

  it("translates, fills placeholders and falls back to English", () => {
    expect(t("Settings")).toBe("Settings");
    setLang("pl");
    expect(t("Settings")).toBe("Ustawienia");
    expect(t("Not in the book {x}", { x: 1 })).toBe("Not in the book 1");
    expect(num(2.5)).toBe("2,5");
  });

  it("counts in Polish with three forms", () => {
    expect(tn(1, "{n} fish", "{n} fish")).toBe("1 fish");
    setLang("pl");
    expect(tn(1, "{n} fish", "{n} fish")).toBe("1 ryba");
    expect(tn(3, "{n} fish", "{n} fish")).toBe("3 ryby");
    expect(tn(5, "{n} fish", "{n} fish")).toBe("5 ryb");
    expect(tn(22, "{n} fish", "{n} fish")).toBe("22 ryby");
    expect(tn(12, "{n} fish", "{n} fish")).toBe("12 ryb");
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "i18n" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const STR = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\x60[^\x60$]*\x60)`;
function unquote(literal: string): string {
  if (literal.startsWith('"')) return JSON.parse(literal) as string;
  return literal.slice(1, -1).replace(/\\(.)/g, "$1");
}

describe("Polish book", () => {
  const files = sources(join(__dirname, ".."));
  const singles = new Set<string>();
  const counted = new Set<string>();
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    for (const match of code.matchAll(new RegExp(String.raw`\bt\(\s*` + STR, "g"))) singles.add(unquote(match[1]));
    for (const match of code.matchAll(new RegExp(String.raw`\btn\(\s*[^,]+,\s*` + STR + String.raw`\s*,\s*` + STR, "g"))) {
      counted.add(unquote(match[2]));
    }
  }

  it("finds the lines to check", () => {
    expect(singles.size).toBeGreaterThan(0);
  });

  it("has every line the code asks for", () => {
    const missing = [...singles].filter((key) => typeof PL[key] !== "string");
    expect(missing).toEqual([]);
  });

  it("has three forms for every counted line", () => {
    const missing = [...counted].filter((key) => !Array.isArray(PL[key]));
    expect(missing).toEqual([]);
  });

  it("keeps every placeholder of the English line", () => {
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const broken = Object.entries(PL).filter(([key, line]) => {
      const want = holes(key).filter((hole) => hole !== "n");
      const lines = typeof line === "string" ? [line] : line;
      return lines.some((text) => {
        const got = holes(text).filter((hole) => hole !== "n");
        return want.some((hole) => !got.includes(hole)) || got.some((hole) => !want.includes(hole));
      });
    });
    expect(broken.map(([key]) => key)).toEqual([]);
  });
});

describe("context keys", () => {
  it("shows the word before the bar in English and its own line in Polish", () => {
    expect(t("Species|count")).toBe("Species");
    setLang("pl");
    expect(t("Species|count")).toBe("Gatunki");
    expect(t("Species")).toBe("Gatunek");
  });
});
