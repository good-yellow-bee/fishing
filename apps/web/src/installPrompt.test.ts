import { describe, expect, it, vi } from "vitest";
import { installApp, watchInstallOffer } from "./installPrompt";

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
