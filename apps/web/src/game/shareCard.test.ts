import { afterEach, describe, expect, it, vi } from "vitest";
import { coverCrop, savePng, shareCardFileName, shareSheetFor } from "./shareCard";

describe("share card", () => {
  it("names the file by species and local day", () => {
    expect(shareCardFileName("tiger-muskie", new Date(2026, 9, 4, 23, 30))).toBe("stillwater-tiger-muskie-2026-10-04.png");
    expect(shareCardFileName("Odd Fish!", new Date(2026, 0, 1))).toBe("stillwater-odd-fish-2026-01-01.png");
    expect(shareCardFileName("???", new Date(2026, 0, 1))).toBe("stillwater-catch-2026-01-01.png");
  });

  it("crops a photo to fill the frame without stretching", () => {
    // A wide 640×400 snapshot into an 800×600 frame: full height, trimmed sides.
    const wide = coverCrop(640, 400, 800, 600);
    expect(wide.sh).toBeCloseTo(400);
    expect(wide.sw / wide.sh).toBeCloseTo(800 / 600);
    expect(wide.sx).toBeCloseTo((640 - wide.sw) / 2);
    expect(wide.sy).toBeCloseTo(0);
    // A tall one: full width, trimmed top and bottom.
    const tall = coverCrop(400, 640, 800, 600);
    expect(tall.sw).toBeCloseTo(400);
    expect(tall.sy).toBeGreaterThan(0);
  });
});

describe("handing a picture on", () => {
  const png = new File([new Uint8Array([1])], "lake.png", { type: "image/png" });
  const canvas = { toBlob: (done: (blob: Blob | null) => void) => done(new Blob([new Uint8Array([1])], { type: "image/png" })) } as unknown as HTMLCanvasElement;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers the share sheet only on a touch screen that can share image files", () => {
    const sharer = { canShare: () => true, share: async () => undefined };
    expect(shareSheetFor(sharer, true, png)).toBe(true);
    expect(shareSheetFor(sharer, false, png)).toBe(false);
    expect(shareSheetFor({ canShare: () => false, share: sharer.share }, true, png)).toBe(false);
    expect(shareSheetFor({ share: sharer.share }, true, png)).toBe(false);
    expect(
      shareSheetFor(
        {
          canShare: () => {
            throw new Error("no");
          },
          share: sharer.share,
        },
        true,
        png,
      ),
    ).toBe(false);
  });

  function phone(share: (data: { files: File[] }) => Promise<void>) {
    vi.stubGlobal("navigator", { canShare: () => true, share });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
  }

  it("shares on a phone, and a closed sheet saves nothing", async () => {
    const share = vi.fn(async (_data: { files: File[] }) => undefined);
    phone(share);
    await expect(savePng(canvas, "lake.png")).resolves.toBe("shared");
    expect(share.mock.calls[0]?.[0].files[0]?.name).toBe("lake.png");
    phone(async () => {
      throw Object.assign(new Error("closed"), { name: "AbortError" });
    });
    await expect(savePng(canvas, "lake.png")).resolves.toBe("cancelled");
  });

  it("downloads when the sheet is refused", async () => {
    phone(async () => {
      throw Object.assign(new Error("late"), { name: "NotAllowedError" });
    });
    const click = vi.fn();
    vi.stubGlobal("document", { createElement: () => ({ click, remove: () => undefined }), body: { appendChild: () => undefined } });
    vi.stubGlobal("URL", { createObjectURL: () => "blob:x", revokeObjectURL: () => undefined });
    await expect(savePng(canvas, "lake.png")).resolves.toBe("downloaded");
    expect(click).toHaveBeenCalled();
  });
});
