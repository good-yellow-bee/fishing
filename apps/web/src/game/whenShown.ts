/** After coming back to a hidden page, this long before the held bite takes the float. */
export const BACK_BITE_MS = 1500;

/**
 * Runs `fn` now while the page is showing. While it is hidden (another tab, another app, a locked phone),
 * holds it until the page shows again and then a short beat more, so nothing that needs a quick hand
 * happens out of sight. Returns a cancel.
 */
export function whenShown(fn: () => void, doc: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener"> = document, afterMs = BACK_BITE_MS) {
  if (doc.visibilityState !== "hidden") {
    fn();
    return () => {};
  }
  let timer = 0;
  const shown = () => {
    if (doc.visibilityState === "hidden") return;
    doc.removeEventListener("visibilitychange", shown);
    timer = window.setTimeout(fn, afterMs);
  };
  doc.addEventListener("visibilitychange", shown);
  return () => {
    doc.removeEventListener("visibilitychange", shown);
    window.clearTimeout(timer);
  };
}
