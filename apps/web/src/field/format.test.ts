import { afterEach, describe, expect, it } from "vitest";
import { reloadLang, setLang } from "../i18n";
import { formatDatedDay, formatLongDay } from "./format";

describe("dates", () => {
  afterEach(() => {
    setLang("en");
    reloadLang();
  });

  it("gives May in the genitive in a Polish date, as the other months are", () => {
    setLang("pl");
    expect(formatDatedDay(new Date(2025, 4, 1, 12))).toContain("1 maja 2025");
    expect(formatLongDay(new Date(2025, 4, 1, 12))).toContain("1 maja");
    expect(formatLongDay(new Date(2025, 4, 1, 12))).not.toContain("majaa");
  });

  it("leaves English alone", () => {
    expect(formatDatedDay(new Date(2025, 4, 1, 12))).toContain("May 1, 2025");
  });
});
