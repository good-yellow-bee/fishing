import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { catchesWithPhotos } from "./PhotosPage";

describe("the photo wall", () => {
  it("keeps only the catches with a photo, in the order given", () => {
    const catches = sampleLogbook(new Date(2026, 9, 1)).catches;
    const withPhoto = new Set([catches[2]!.id, catches[0]!.id]);
    expect(catchesWithPhotos(catches, (id) => withPhoto.has(id)).map((entry) => entry.id)).toEqual([catches[0]!.id, catches[2]!.id]);
  });
});
