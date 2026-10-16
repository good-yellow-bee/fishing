import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIELD_THEME_KEY, readFieldTheme, themeNow, writeFieldTheme } from "./fieldTheme";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("field theme", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("window", new EventTarget());
  });

  it("follows the device until a choice is stored, and forgets the choice when set back", () => {
    expect(readFieldTheme()).toBe("device");
    writeFieldTheme("dark");
    expect(localStorage.getItem(FIELD_THEME_KEY)).toBe("dark");
    expect(readFieldTheme()).toBe("dark");
    writeFieldTheme("device");
    expect(localStorage.getItem(FIELD_THEME_KEY)).toBeNull();
    expect(readFieldTheme()).toBe("device");
  });

  it("holds a refused choice for the page, and lets it go once a later choice is stored", () => {
    const store = memoryStorage();
    vi.stubGlobal("localStorage", {
      ...store,
      setItem: () => {
        throw new Error("full");
      },
    });
    writeFieldTheme("dark");
    expect(themeNow()).toBe("dark");
    writeFieldTheme("device");
    expect(themeNow()).toBe("device");
  });

  it("reads anything else stored as the device's choice", () => {
    localStorage.setItem(FIELD_THEME_KEY, "purple");
    expect(readFieldTheme()).toBe("device");
  });
});
