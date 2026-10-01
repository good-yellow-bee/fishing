import { CATCH_PHOTO_MAX_BYTES, catchPhotoRejection } from "@stillwater/shared";

const EDGES = [1280, 960, 720, 560];
const QUALITIES = [0.72, 0.56, 0.42];
const FILE_CEILING = 12 * 1024 * 1024;

export type CompressedPhoto = { ok: true; dataUrl: string } | { ok: false; message: string };

function jpegDataUrl(source: CanvasImageSource, width: number, height: number, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressCatchPhoto(file: File): Promise<CompressedPhoto> {
  if (file.type && !file.type.startsWith("image/")) {
    return { ok: false, message: "Choose a JPEG, PNG, or WebP photo." };
  }
  if (file.size > FILE_CEILING) {
    const megabytes = FILE_CEILING / (1024 * 1024);
    return {
      ok: false,
      message: `That file is too large to reduce here. Photos over ${megabytes} MB are turned away before they are reduced.`,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, message: "That photo could not be read. Choose a JPEG, PNG, or WebP." };
  }

  try {
    for (const edge of EDGES) {
      for (const quality of QUALITIES) {
        const dataUrl = jpegDataUrl(bitmap, bitmap.width, bitmap.height, edge, quality);
        if (dataUrl && !catchPhotoRejection(dataUrl)) return { ok: true, dataUrl };
      }
    }
    return {
      ok: false,
      message: `That photo is still over ${CATCH_PHOTO_MAX_BYTES / 1024} KB after it is reduced, so it was not saved.`,
    };
  } catch {
    return { ok: false, message: "That photo could not be read. Choose a JPEG, PNG, or WebP." };
  } finally {
    try {
      bitmap.close();
    } catch {
      // The data URL already holds the pixels when close fails.
    }
  }
}
