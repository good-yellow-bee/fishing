import { describe, expect, it } from "vitest";
import { PHOTO_EDGE, clearCatchShot, latestCatchShot, photoSize, postCatchShot, subscribeCatchShot } from "./catchPhoto";

describe("catch photo", () => {
  it("caps the longest edge and keeps the aspect", () => {
    expect(photoSize(1600, 900)).toEqual({ width: PHOTO_EDGE, height: 360 });
    expect(photoSize(500, 1000)).toEqual({ width: 320, height: PHOTO_EDGE });
  });

  it("never scales a small canvas up", () => {
    expect(photoSize(400, 300)).toEqual({ width: 400, height: 300 });
  });

  it("tells listeners about each new shot", () => {
    clearCatchShot();
    const seen: number[] = [];
    const stop = subscribeCatchShot(() => seen.push(latestCatchShot()?.seq ?? 0));
    postCatchShot("data:image/jpeg;base64,AAAA");
    postCatchShot("data:image/jpeg;base64,BBBB");
    stop();
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBeGreaterThan(seen[0]!);
    expect(latestCatchShot()?.dataUrl).toBe("data:image/jpeg;base64,BBBB");
    clearCatchShot();
    expect(latestCatchShot()).toBeNull();
  });
});
