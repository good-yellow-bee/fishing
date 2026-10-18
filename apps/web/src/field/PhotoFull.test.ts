import { describe, expect, it } from "vitest";
import { photoFileName } from "./PhotoFull";

describe("a saved photo's name", () => {
  it("reads the fish and day, with the photo's own type", () => {
    expect(photoFileName("data:image/jpeg;base64,AAA", "Northern pike 2026-10-10")).toBe("northern-pike-2026-10-10.jpg");
    expect(photoFileName("data:image/webp;base64,AAA", "Szczupak 2026-10-10")).toBe("szczupak-2026-10-10.webp");
    expect(photoFileName("data:image/png;base64,AAA", "Okoń (duży)")).toBe("okoń-duży.png");
    expect(photoFileName("blob:x", "!!")).toBe("fish.jpg");
  });
});
