import { useEffect } from "react";

/**
 * ← and → step to the newer or older entry, as the page's own "Later" and "Earlier" links do. Left alone while typing,
 * in a dialog, or with a modifier held (Alt+← is the browser's Back).
 */
export function useStepKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable], dialog, [role=dialog], [role=alertdialog]")) return;
      const link = document.querySelector<HTMLAnchorElement>(`.catch-steps a[rel=${event.key === "ArrowLeft" ? "prev" : "next"}]`);
      if (!link) return;
      event.preventDefault();
      link.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
