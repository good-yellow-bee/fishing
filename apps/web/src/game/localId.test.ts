import { afterEach, describe, expect, it, vi } from "vitest";
import { localId } from "./localId";

afterEach(() => vi.unstubAllGlobals());

describe("localId", () => {
  it("uses randomUUID when the browser exposes it", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-from-browser" });
    expect(localId()).toBe("uuid-from-browser");
  });

  it("uses getRandomValues on local HTTP, where randomUUID is missing", () => {
    const real = globalThis.crypto;
    const getRandomValues = vi.fn(real.getRandomValues.bind(real));
    vi.stubGlobal("crypto", { getRandomValues });
    const ids = new Set(Array.from({ length: 20 }, () => localId()));
    expect(getRandomValues).toHaveBeenCalledTimes(20);
    expect(ids.size).toBe(20);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it("keeps a local catch playable without any crypto API", () => {
    vi.stubGlobal("crypto", {});
    const ids = new Set(Array.from({ length: 20 }, () => localId()));
    expect(ids.size).toBe(20);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
