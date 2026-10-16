import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetDeletedFish, noteDeletedFish, readDeletedFish } from "./deletedFish";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("deleted fish", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("remembers deleted fish until a delete is undone", () => {
    noteDeletedFish(["a", "b"]);
    noteDeletedFish(["b", "c"]);
    expect([...readDeletedFish()].sort()).toEqual(["a", "b", "c"]);
    forgetDeletedFish(["b"]);
    expect([...readDeletedFish()].sort()).toEqual(["a", "c"]);
  });

  it("reads a broken list as empty", () => {
    localStorage.setItem("stillwater.field-log.deleted.v1", "{");
    expect(readDeletedFish().size).toBe(0);
  });
});
