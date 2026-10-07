import { keepLandedCatch, sampleLogbook, type LandedFish } from "@stillwater/shared";
import { readStoredLogbook, saveLogbook } from "./storage";

export function saveLandedCatch(landed: LandedFish) {
  const book = readStoredLogbook() ?? sampleLogbook(new Date());
  saveLogbook(keepLandedCatch(book, landed));
}
