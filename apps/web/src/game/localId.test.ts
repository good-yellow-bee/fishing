import { afterEach, describe, expect, it, vi } from "vitest";
import { localId } from "./localId";

afterEach(() => vi.unstubAllGlobals());

describe("localId", () => {
  it("uses randomUUID when the browser exposes it", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-from-browser" });
    expect(localId()).toBe("uuid-from-browser");
  });

  it("keeps a local catch playable without crypto.randomUUID", () => {
    vi.stubGlobal("crypto", {});
    expect(localId()).toMatch(/^local-[a-z0-9]+-[a-z0-9]+$/);
  });
});
