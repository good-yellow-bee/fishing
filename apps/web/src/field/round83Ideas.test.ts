import { beforeEach, describe, expect, it, vi } from "vitest";
import { keepRecent } from "./CatchSearch";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("round 83 ideas: the last searches under the find box", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("keeps three, newest first, each once however it was spelled", () => {
    keepRecent("pike");
    keepRecent("zander + 2026");
    keepRecent("photo");
    expect(keepRecent("Pike")).toEqual(["Pike", "photo", "zander + 2026"]);
  });
});
