/**
 * Short words for the lake's sounds, for players who can't hear them. The
 * sound code calls `captionSound` as each one plays; the captions strip
 * listens while the setting is on.
 */
export type SoundCaption = "thunderNear" | "thunderFar" | "loon" | "owl" | "geese" | "tailSlap" | "farSplash" | "woodpecker" | "swanHiss" | "terns" | "grebes";

export const CAPTION_TEXT: Record<SoundCaption, string> = {
  thunderNear: "Thunder cracks close by",
  thunderFar: "Thunder rolls far off",
  loon: "A loon calls",
  owl: "An owl hoots",
  geese: "Geese honk overhead",
  tailSlap: "A beaver slaps its tail",
  farSplash: "A bird plunges into the lake",
  woodpecker: "A woodpecker drums in the woods",
  swanHiss: "A swan hisses",
  terns: "Terns call over the water",
  grebes: "Grebes patter and call across the water",
};

/** How long a caption stays up, ms. */
export const CAPTION_MS = 4000;
/** No more than this many show at once; the oldest goes first. */
export const CAPTION_MAX = 3;

export type ShownCaption = { id: number; kind: SoundCaption; at: number };

const listeners = new Set<(kind: SoundCaption) => void>();

export function onSoundCaption(listener: (kind: SoundCaption) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function captionSound(kind: SoundCaption) {
  for (const listener of listeners) listener(kind);
}

/** The strip after a new sound at `now`: stale ones drop, a repeat of a showing caption just refreshes it, and only the newest few stay. */
export function addCaption(shown: ShownCaption[], kind: SoundCaption, now: number, id: number): ShownCaption[] {
  const live = shown.filter((c) => now - c.at < CAPTION_MS && c.kind !== kind);
  return [...live, { id, kind, at: now }].slice(-CAPTION_MAX);
}

/** The strip at `now`, without the captions whose time is up. */
export function pruneCaptions(shown: ShownCaption[], now: number) {
  return shown.filter((c) => now - c.at < CAPTION_MS);
}
