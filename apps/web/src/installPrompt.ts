import { useSyncExternalStore } from "react";

/** Chrome's deferred install offer; not in the DOM types. */
type InstallOffer = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let offer: InstallOffer | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

/**
 * Hold on to the browser's install offer so the field log can show its own
 * button. The offer comes early, often before React draws, so this listens
 * from the start. Browsers without one (Safari, Firefox) never show the button.
 */
export function watchInstallOffer(target: Pick<Window, "addEventListener"> = window) {
  target.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    offer = event as InstallOffer;
    changed();
  });
  target.addEventListener("appinstalled", () => {
    offer = null;
    changed();
  });
}

/** Show the browser's install dialog; the offer is spent either way. */
export async function installApp() {
  const current = offer;
  if (!current) return false;
  offer = null;
  changed();
  try {
    await current.prompt();
    return (await current.userChoice).outcome === "accepted";
  } catch {
    return false;
  }
}

export function useInstallOffer() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => offer !== null,
    () => false,
  );
}

/**
 * Safari on an iPhone or iPad never offers an install, but Share, then Add to
 * Home Screen does the same. True there when the app isn't already on the
 * home screen.
 */
export function homeScreenTip(nav: Navigator & { standalone?: boolean } = navigator) {
  if (nav.standalone !== false) return false;
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}
