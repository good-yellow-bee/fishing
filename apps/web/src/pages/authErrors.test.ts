import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${import.meta.dirname}/${path}`, "utf8");

// A refused sign-in is spoken, and it and the hovered button stay readable.
describe("the sign-in pages' errors", () => {
  it.each(["Login.tsx", "Register.tsx"])("%s announces its error line (WCAG 4.1.3)", (path) => {
    expect(read(path)).toContain('<p className="error" role="alert">{error}</p>');
  });

  it("draws the error and the hovered button in a rust with 4.5:1 contrast (WCAG 1.4.3)", () => {
    const css = read("../index.css");
    expect(/\n\.auth-card \.error \{([^}]*)\}/.exec(css)?.[1]).toContain("color: #8f3a28;");
    expect(/\n\.auth-card button:hover \{([^}]*)\}/.exec(css)?.[1]).toContain("background: #8f3a28;");
  });
});

describe("keyboard focus on the sign-in card", () => {
  it("draws the focus ring in the card's deep rust, 5.1:1 where the amber was 1.5:1", () => {
    expect(/\n\.auth-card :is\(a, button\):focus-visible \{([^}]*)\}/.exec(read("../index.css"))?.[1]).toContain("outline-color: #8f3a28;");
  });
});

describe("joining", () => {
  it("says the password's 8-character floor before the first try, tied to the field (WCAG 3.3.2)", () => {
    const page = read("Register.tsx");
    expect(page).toContain('aria-describedby="password-hint"');
    expect(page).toContain('<p className="field-help" id="password-hint">');
    expect(page).toContain('{t("At least 8 characters.")}');
  });

  it("names the display name's purpose so the phone can fill it in (WCAG 1.3.5)", () => {
    expect(read("Register.tsx")).toContain('<input id="name" autoComplete="nickname"');
  });
});
