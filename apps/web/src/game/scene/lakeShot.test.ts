// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { LAKE_SHOT_WAIT_MS, lakePictureFileName, lakeShotWanted, requestLakeShot, takeLakeShot } from "./lakeShot";

function source(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

describe("lake pictures", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("copies the next frame at its full size, once", async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    expect(lakeShotWanted()).toBe(false);
    const shot = requestLakeShot();
    expect(lakeShotWanted()).toBe(true);
    const frame = source(1920, 1080);
    takeLakeShot(frame);
    expect(lakeShotWanted()).toBe(false);
    const canvas = await shot;
    expect(canvas?.width).toBe(1920);
    expect(canvas?.height).toBe(1080);
    expect(drawImage).toHaveBeenCalledWith(frame, 0, 0);
    takeLakeShot(frame);
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it("gives up when no frame comes", async () => {
    vi.useFakeTimers();
    const shot = requestLakeShot();
    vi.advanceTimersByTime(LAKE_SHOT_WAIT_MS);
    await expect(shot).resolves.toBeNull();
    expect(lakeShotWanted()).toBe(false);
  });

  it("answers an earlier ask with nothing when a new one comes", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    const first = requestLakeShot();
    const second = requestLakeShot();
    await expect(first).resolves.toBeNull();
    takeLakeShot(source(4, 3));
    expect((await second)?.width).toBe(4);
  });

  it("names the file by day and minute", () => {
    expect(lakePictureFileName(new Date(2026, 9, 4, 7, 5))).toBe("stillwater-lake-2026-10-04-0705.png");
  });
});
