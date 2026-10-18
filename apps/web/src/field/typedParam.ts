import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * A search box's text, held here as well as in the address under `key` (so Back returns to the same matches). Read
 * from the address alone, a quick key arrived before the address caught up and the box wrote the older text back,
 * dropping letters and sending the caret to the end.
 */
export function useTypedParam(key: string): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const linked = params.get(key) ?? "";
  const [typed, setTyped] = useState(linked);
  // Everything typed since the address last changed some other way.
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    // The address catching up with the box is not a new search; Back or Forward to another one is.
    if (seen.current.has(linked)) return;
    seen.current = new Set();
    setTyped(linked);
  }, [linked]);
  const set = (next: string) => {
    seen.current.add(next.trim() ? next : "");
    setTyped(next);
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next.trim()) out.set(key, next);
        else out.delete(key);
        return out;
      },
      { replace: true },
    );
  };
  return [typed, set];
}
