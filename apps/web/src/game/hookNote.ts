/** The hookset's message stays on the fight card at least this long. */
export const HOOK_NOTE_MIN_MS = 3500;
/** And at most this long, so a long one doesn't crowd the card through the fight. */
export const HOOK_NOTE_MAX_MS = 9000;
/** Reading time per character of the message. */
export const HOOK_NOTE_CHAR_MS = 40;

/** How long the fight card shows the message set as the fight starts (or a call made mid-fight), sized to its length. */
export function hookNoteMs(text: string): number {
  return Math.min(HOOK_NOTE_MAX_MS, Math.max(HOOK_NOTE_MIN_MS, text.length * HOOK_NOTE_CHAR_MS));
}
