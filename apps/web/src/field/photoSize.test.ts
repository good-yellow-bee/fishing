import { describe, expect, it } from "vitest";
import { storedSize } from "./PhotosPage";

describe("storedSize", () => {
  it("is the length the photos take as stored", () => {
    const photos = { "c-1": "data:image/jpeg;base64,AAAA", "c-2": "data:image/jpeg;base64,BBBBBB" };
    expect(storedSize(photos)).toBe(JSON.stringify(photos).length);
    expect(storedSize({})).toBe(JSON.stringify({}).length);
    expect(storedSize({ x: "data:image/png;base64,Q" })).toBe(JSON.stringify({ x: "data:image/png;base64,Q" }).length);
  });
});
