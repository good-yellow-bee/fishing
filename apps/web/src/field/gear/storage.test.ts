import { beforeEach, describe, expect, it, vi } from "vitest";
import { TACKLE_STORAGE_KEY, UNREADABLE_TACKLE_KEY, readTackle, readUnreadableTackle } from "./storage";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("readTackle", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("sets unreadable lists aside before anything writes over them", () => {
    localStorage.setItem(TACKLE_STORAGE_KEY, "{not json");
    expect(readTackle()).toBeNull();
    expect(readUnreadableTackle()).toBe("{not json");
  });

  it("keeps the first unreadable copy", () => {
    localStorage.setItem(TACKLE_STORAGE_KEY, '{"items":"first"}');
    readTackle();
    localStorage.setItem(TACKLE_STORAGE_KEY, '{"items":"second"}');
    readTackle();
    expect(localStorage.getItem(UNREADABLE_TACKLE_KEY)).toBe('{"items":"first"}');
  });

  it("sets nothing aside for readable or missing lists", () => {
    expect(readTackle()).toBeNull();
    localStorage.setItem(TACKLE_STORAGE_KEY, JSON.stringify({ items: [] }));
    expect(readTackle()).toEqual([]);
    expect(readUnreadableTackle()).toBeNull();
  });
});
