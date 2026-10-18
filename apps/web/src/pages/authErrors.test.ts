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
