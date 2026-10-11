import type { SpotId } from "./types.ts";

/** Someone else's recent catch, shown as a faint ring on that bank's water. Display names are already public on the board. */
export type LodgeTrack = {
  id: string;
  displayName: string;
  speciesId: string;
  spot: SpotId;
  createdAt: string;
};

/** How long a track stays on the water. */
export const TRACK_WINDOW_MS = 60 * 60 * 1000;
export const TRACK_LIMIT = 20;
