import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./serviceWorker";

type Plan = (url: string, method: string, mode: string, origin: string) => string;

function loadWorker() {
  const scope: { cachePlan?: Plan; shellAssets?: (html: string) => string[]; addEventListener: (type: string) => void; location: { origin: string } } = {
    addEventListener: vi.fn(),
    location: { origin: "https://lake.test" },
  };
  const code = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  new Function("self", "caches", "fetch", code)(scope, {}, vi.fn());
  return scope;
}

describe("service worker", () => {
  const scope = loadWorker();
  const plan = (path: string, mode = "cors", method = "GET", origin = "https://lake.test") =>
    scope.cachePlan!(`${origin}${path}`, method, mode, "https://lake.test");

  it("finds the shell page's built scripts and styles to keep at install", () => {
    const html = '<script type="module" crossorigin src="/assets/index-a1.js"></script><link rel="stylesheet" href="/assets/index-b2.css"><link rel="icon" href="/icons/icon-192.png"><link rel="modulepreload" href="/assets/index-a1.js">';
    expect(scope.shellAssets!(html)).toEqual(["/assets/index-a1.js", "/assets/index-b2.css"]);
  });

  it("never caches the API or other sites", () => {
    expect(plan("/api/me")).toBe("skip");
    expect(plan("/api/auth/get-session", "navigate")).toBe("skip");
    expect(plan("/assets/app.js", "cors", "GET", "https://fonts.gstatic.com")).toBe("skip");
    expect(plan("/assets/app.js", "cors", "POST")).toBe("skip");
  });

  it("serves pages from the network with the shell as a fallback, and builds from cache", () => {
    expect(plan("/play", "navigate")).toBe("page");
    expect(plan("/", "navigate")).toBe("page");
    expect(plan("/assets/Dock-abc123.js")).toBe("asset");
    expect(plan("/models/tree_oak.glb")).toBe("static");
    expect(plan("/textures/waternormals.jpg")).toBe("static");
    expect(plan("/manifest.webmanifest")).toBe("static");
    expect(plan("/src/main.tsx")).toBe("skip");
  });

  it("listens for install, activate and fetch", () => {
    expect(vi.mocked(scope.addEventListener).mock.calls.map(([type]) => type)).toEqual(["install", "activate", "fetch"]);
  });
});

describe("registerServiceWorker", () => {
  function env(prod: boolean, withWorker = true) {
    const register = vi.fn(() => Promise.resolve());
    const listeners: Record<string, () => void> = {};
    const window = { addEventListener: (type: string, fn: () => void) => (listeners[type] = fn) } as unknown as Window;
    const navigator = (withWorker ? { serviceWorker: { register } } : {}) as unknown as Navigator;
    return { env: { prod, navigator, window }, register, listeners };
  }

  it("registers /sw.js after load in production builds only", () => {
    const prod = env(true);
    expect(registerServiceWorker(prod.env)).toBe(true);
    prod.listeners.load();
    expect(prod.register).toHaveBeenCalledWith("/sw.js");
    expect(registerServiceWorker(env(false).env)).toBe(false);
    expect(registerServiceWorker(env(true, false).env)).toBe(false);
  });
});
