/**
 * "30in+" or "2 kg+", as anglers say a 30-plus pike, and "20+ in", the plus before the unit: each read as ">30in",
 * not a "+" joining parts, so both searches can split on "+" after.
 */
export function readSizePlus(text: string): string {
  return text
    .replace(/(^|[\s+])((?:\d+\s?lbs?\s+)?\d+(?:[.,]\d+)?\s?(?:lbs?|oz|kg|dag|g|in|cm|mm|°?[cf]))\+(?=[\s+]|$)/gi, "$1>$2")
    .replace(/(^|[\s+])(\d+(?:[.,]\d+)?)\+\s?(lbs?|oz|kg|dag|g|in|cm|mm|°?[cf])(?=[\s+]|$)/gi, "$1>$2 $3");
}
