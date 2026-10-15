import { describe, expect, it, vi } from "vitest";
import { homeScreenTip, installApp, watchInstallOffer } from "./installPrompt";

function fakeWindow() {
  const handlers = new Map<string, (event: Event) => void>();
  return {
    addEventListener: (type: string, handler: (event: Event) => void) => handlers.set(type, handler),
    fire: (type: string, event: Event) => handlers.get(type)?.(event),
  };
}

describe("install the app from the field log", () => {
  it("keeps the browser's offer and spends it on one install", async () => {
    const win = fakeWindow();
    watchInstallOffer(win as unknown as Window);
    const prompt = vi.fn(async () => undefined);
    const offer = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    win.fire("beforeinstallprompt", offer);
    expect(offer.defaultPrevented).toBe(true);
    expect(await installApp()).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(await installApp()).toBe(false);
  });

  it("forgets the offer once the app is installed another way", async () => {
    const win = fakeWindow();
    watchInstallOffer(win as unknown as Window);
    win.fire("beforeinstallprompt", Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: new Promise(() => undefined) }));
    win.fire("appinstalled", new Event("appinstalled"));
    expect(await installApp()).toBe(false);
  });
});

describe("the home screen tip on an iPhone", () => {
  const nav = (userAgent: string, standalone: boolean | undefined, platform = "iPhone", maxTouchPoints = 5) =>
    ({ userAgent, standalone, platform, maxTouchPoints }) as unknown as Navigator;

  it("shows in Safari on an iPhone or iPad that hasn't added the app", () => {
    expect(homeScreenTip(nav("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", false))).toBe(true);
    expect(homeScreenTip(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", false, "MacIntel", 5))).toBe(true);
  });

  it("hides once the app is on the home screen, and on browsers without the flag", () => {
    expect(homeScreenTip(nav("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", true))).toBe(false);
    expect(homeScreenTip(nav("Mozilla/5.0 (Linux; Android 15)", undefined, "Linux"))).toBe(false);
    expect(homeScreenTip(nav("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", false, "MacIntel", 0))).toBe(false);
  });
});
