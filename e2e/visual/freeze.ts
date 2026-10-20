/**
 * Runs in the page before the app (page.addInitScript), so every screenshot sees the same moment:
 * - Date is fixed at `fixedAt` and does not move.
 * - Math.random is a seeded generator, seeded again when the test starts stepping frames.
 * - performance.now and requestAnimationFrame's time stand still while the lake loads, so every per-frame step
 *   (clock deltas, texture scrolls, easing) stays at zero however long the software renderer takes. Then
 *   window.__shot.hold() stops drawing (so a wait costs no rendering), and window.__shot.step(n) reseeds Math.random
 *   and draws exactly n frames 1/60 s apart.
 */
export function freezeTime(fixedAt: number) {
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args: ConstructorParameters<typeof Date> | []) {
      if (args.length === 0) super(fixedAt);
      else super(...(args as ConstructorParameters<typeof Date>));
    }
    static now() {
      return fixedAt;
    }
  }
  window.Date = FixedDate as DateConstructor;

  let seed = 0;
  const reseed = () => {
    seed = 0x9e3779b9;
  };
  reseed();
  Math.random = () => {
    // mulberry32
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let now = 0;
  performance.now = () => now;
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  let manual = false;
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();
  window.requestAnimationFrame = (callback) => {
    if (!manual) return nativeRaf(() => callback(now));
    const id = nextId++;
    queue.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    if (!queue.delete(id)) nativeCancel(id);
  };
  // The software renderer presents a frame after it is drawn; a real frame between steps lets it show.
  const nativeFrame = () => new Promise<void>((resolve) => nativeRaf(() => resolve()));
  (window as unknown as { __shot: unknown }).__shot = {
    hold() {
      manual = true;
    },
    async step(frames: number) {
      reseed();
      for (let i = 0; i < frames; i++) {
        now += 1000 / 60;
        const due = [...queue.values()];
        queue.clear();
        for (const callback of due) callback(now);
        await nativeFrame();
      }
    },
  };
}
