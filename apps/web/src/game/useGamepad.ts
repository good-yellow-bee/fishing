import { useEffect, useRef, useState } from "react";
import { aimLean, keyChanges, moveCursor, padKeys, type PadKeys } from "./gamepad";

/**
 * Polls the first connected controller each frame and replays it as keys on the window and pointer moves
 * from an on-screen cursor. Returns whether a controller is connected, and where to draw the cursor
 * (null while it has not aimed).
 */
export function useGamepad(enabled = true) {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const keys = useRef<PadKeys>(new Set());
  const at = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return;
    let frame = 0;
    let last = performance.now();
    const send = (type: "keydown" | "keyup", code: string, key: string) =>
      window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true }));
    const releaseAll = () => {
      for (const change of keyChanges(keys.current, new Set())) send(change.type, change.code, change.key);
      keys.current = new Set();
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const pad = [...navigator.getGamepads()].find((one) => one?.connected);
      setConnected(pad !== undefined && pad !== null);
      if (!pad) {
        releaseAll();
        return;
      }
      const next = padKeys(pad);
      for (const change of keyChanges(keys.current, next)) send(change.type, change.code, change.key);
      keys.current = next;
      const lean = aimLean(pad);
      if (lean.x === 0 && lean.y === 0) return;
      const box = { width: window.innerWidth, height: window.innerHeight };
      const moved = moveCursor(at.current ?? { x: box.width / 2, y: box.height / 2 }, lean, dt, box);
      at.current = moved;
      setCursor(moved);
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: moved.x, clientY: moved.y, pointerType: "mouse", bubbles: true }));
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("blur", releaseAll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [enabled]);

  return { cursor, connected };
}
