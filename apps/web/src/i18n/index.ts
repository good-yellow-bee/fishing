import { useSyncExternalStore } from "react";
import { PL } from "./pl";

/**
 * The game's language, picked from the browser on a first visit and then
 * remembered in this browser. English text is the key: `t("Cast again")`
 * looks the line up in the Polish book and falls back to English when a
 * line is missing, so an untranslated string never breaks a screen.
 */

export type Lang = "en" | "pl";

export const LANGS: readonly Lang[] = ["en", "pl"];
export const LANG_KEY = "stillwater.lang.v1";

/** Polish when the browser's first language that we speak is Polish. */
export function detectLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "pl") return "pl";
    if (base === "en") return "en";
  }
  return "en";
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}

function load(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "pl") return stored;
  } catch {
    // No storage: go by the browser.
  }
  return detectLang(browserLanguages());
}

let lang: Lang = load();
const listeners = new Set<() => void>();

function mark() {
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}
mark();

export function getLang(): Lang {
  return lang;
}

/** The BCP 47 tag for dates and numbers. */
export function locale(): string {
  return lang === "pl" ? "pl-PL" : "en-US";
}

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // Private mode: the choice holds for this visit.
  }
  mark();
  listeners.forEach((listener) => listener());
}

/** Reload from storage and the browser; for tests. */
export function reloadLang() {
  lang = load();
  mark();
  listeners.forEach((listener) => listener());
}

export function subscribeLang(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, () => lang, () => lang);
}

export type Vars = Record<string, string | number>;

/**
 * A key may carry a context after a bar, "Species|board", when one English
 * word needs two Polish ones; English shows only the part before the bar.
 */
function english(text: string): string {
  const bar = text.indexOf("|");
  return bar === -1 ? text : text.slice(0, bar);
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/**
 * One line in the current language. `{name}` placeholders are filled from
 * `vars` after the lookup, so the key keeps its placeholders.
 */
export function t(text: string, vars?: Vars): string {
  if (lang === "pl") {
    const line = PL[text];
    if (typeof line === "string") return fill(line, vars);
  }
  return fill(english(text), vars);
}

const plRules = new Intl.PluralRules("pl-PL");

/**
 * A counted line: English picks `one` or `other`; Polish keys the book on
 * `other` and keeps three forms, [one, few, many] (1 ryba, 2 ryby, 5 ryb).
 * `{n}` is filled with the count.
 */
export function tn(n: number, one: string, other: string, vars?: Vars): string {
  const all = { n, ...vars };
  if (lang === "pl") {
    const forms = PL[other];
    if (Array.isArray(forms)) {
      const rule = plRules.select(n);
      const form = rule === "one" ? forms[0] : rule === "many" ? forms[2] : forms[1];
      return fill(form, all);
    }
  }
  return fill(english(n === 1 ? one : other), all);
}

/** A number with the language's decimal mark, e.g. 2.5 → "2,5" in Polish. */
export function num(value: number, maxDigits = 1): string {
  return value.toLocaleString(locale(), { maximumFractionDigits: maxDigits, useGrouping: false });
}

/** For components: re-renders on a language change and hands back `t`. */
export function useT() {
  useLang();
  return t;
}
