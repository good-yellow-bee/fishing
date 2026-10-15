import { describe, expect, it } from "vitest";
import { CATCH_PAGE, catchPage } from "./PagedCatches";

describe("catchPage", () => {
  it("draws a page at a time and offers the rest in steps", () => {
    const all = Array.from({ length: 120 }, (_, i) => i);
    expect(catchPage(all, CATCH_PAGE)).toEqual({ visible: all.slice(0, 50), more: 50 });
    expect(catchPage(all, CATCH_PAGE * 2).more).toBe(20);
    expect(catchPage(all, CATCH_PAGE * 3)).toEqual({ visible: all, more: 0 });
    expect(catchPage(all.slice(0, 7), CATCH_PAGE).more).toBe(0);
  });
});
