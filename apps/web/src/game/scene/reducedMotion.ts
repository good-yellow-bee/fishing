import { useEffect, useState } from "react";
import { useSettings } from "../settings";

const QUERY = "(prefers-reduced-motion: reduce)";

/** The moment drifting things are held at for reduced motion, as if the air had stilled. */
export const STILL_TIME = 8;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
}

/** Follows the system "reduce motion" setting and the in-game one, live. */
export function useReducedMotion() {
  const { reduceMotion } = useSettings();
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced || reduceMotion;
}
