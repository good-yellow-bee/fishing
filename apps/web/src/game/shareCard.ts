/**
 * A picture of a landed fish to keep or send: the photo the scene snapped as
 * the fish was held up, with the catch written underneath. Made on the device
 * and saved as a file; nothing is uploaded.
 */

export const CARD_WIDTH = 800;
export const PHOTO_HEIGHT = 600;
export const CARD_HEIGHT = 900;

export type ShareCardText = {
  /** The species, as shown on the landed card. */
  title: string;
  /** "3.4 lb · Point" */
  detail: string;
  /** "Dusk · Rain · Fall" */
  conditions: string;
  /** Date of the catch, in the angler's language. */
  date: string;
};

/** File name for the saved picture: species and day, safe on any system. */
export function shareCardFileName(speciesId: string, when: Date): string {
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  const slug = speciesId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "catch";
  return `stillwater-${slug}-${day}.png`;
}

/** Source rectangle that fills `width × height` from an image without stretching it. */
export function coverCrop(imageWidth: number, imageHeight: number, width: number, height: number) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const sw = width / scale;
  const sh = height / scale;
  return { sx: (imageWidth - sw) / 2, sy: (imageHeight - sh) / 2, sw, sh };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("photo"));
    image.src = src;
  });
}

/** Draws the card; without a photo the top is a plain lake-blue panel. */
export async function drawShareCard(text: ShareCardText, photo: string | null): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#2f5d6a";
  ctx.fillRect(0, 0, CARD_WIDTH, PHOTO_HEIGHT);
  if (photo) {
    try {
      const image = await loadImage(photo);
      const crop = coverCrop(image.naturalWidth, image.naturalHeight, CARD_WIDTH, PHOTO_HEIGHT);
      ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, CARD_WIDTH, PHOTO_HEIGHT);
    } catch {
      // A photo that will not load leaves the plain panel.
    }
  }
  ctx.fillStyle = "#efe0c2";
  ctx.fillRect(0, PHOTO_HEIGHT, CARD_WIDTH, CARD_HEIGHT - PHOTO_HEIGHT);
  ctx.fillStyle = "#665139";
  ctx.fillRect(0, PHOTO_HEIGHT, CARD_WIDTH, 3);
  await document.fonts?.ready;
  ctx.fillStyle = "#1c1814";
  ctx.textBaseline = "alphabetic";
  ctx.font = '600 52px Fraunces, "Times New Roman", serif';
  ctx.fillText(text.title, 40, PHOTO_HEIGHT + 82, CARD_WIDTH - 80);
  ctx.font = '28px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(text.detail, 40, PHOTO_HEIGHT + 140, CARD_WIDTH - 80);
  ctx.fillStyle = "#4a3b2a";
  ctx.font = '22px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(text.conditions, 40, PHOTO_HEIGHT + 186, CARD_WIDTH - 80);
  ctx.fillText(text.date, 40, PHOTO_HEIGHT + 222, CARD_WIDTH - 340);
  ctx.textAlign = "right";
  ctx.font = '600 26px Fraunces, "Times New Roman", serif';
  ctx.fillText("Stillwater", CARD_WIDTH - 40, PHOTO_HEIGHT + 222);
  return canvas;
}

/** Draws the card and hands it on as a PNG: the share sheet on a touch screen, a download elsewhere. */
export async function saveShareCard(text: ShareCardText, photo: string | null, fileName: string): Promise<PngSaved> {
  const canvas = await drawShareCard(text, photo);
  return savePng(canvas, fileName);
}

/** "shared": the share sheet took it; "cancelled": the player closed the sheet; "downloaded": the browser saved a file. */
export type PngSaved = "shared" | "cancelled" | "downloaded";

type ShareNavigator = {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[] }) => Promise<void>;
};

/** Whether this device should get the share sheet: a touch screen that can share image files. */
export function shareSheetFor(nav: ShareNavigator, coarse: boolean, file: File) {
  if (!coarse || typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function coarsePointer() {
  try {
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Hands a canvas on as a PNG. Phones get the share sheet, where Save Image puts it in the photos
 * (a download lands in Files, which is hard to find); anything else, or a sheet the browser refuses, downloads.
 */
export async function savePng(canvas: HTMLCanvasElement, fileName: string): Promise<PngSaved> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("png");
  const nav = navigator as unknown as ShareNavigator;
  if (typeof File === "function") {
    const file = new File([blob], fileName, { type: "image/png" });
    if (shareSheetFor(nav, coarsePointer(), file)) {
      try {
        await nav.share!({ files: [file] });
        return "shared";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return "cancelled";
        // Refused (the tap's activation ran out while drawing): download instead.
      }
    }
  }
  downloadBlob(blob, fileName);
  return "downloaded";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the download a moment to start before letting the blob go.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
