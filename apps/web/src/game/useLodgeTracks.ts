import { useEffect, useRef, useState } from "react";
import type { LodgeTrack } from "@stillwater/shared";
import { getLodgeTracks } from "../api";

/** How often the dock asks who else has been fishing. */
export const TRACK_POLL_MS = 120_000;

/** Other anglers' recent catches. Polls only while the bank is calm, so a fight never waits on the network. */
export function useLodgeTracks(signedIn: boolean, calm: boolean): LodgeTrack[] {
  const [tracks, setTracks] = useState<LodgeTrack[]>([]);
  const calmRef = useRef(calm);
  calmRef.current = calm;

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    const read = () => {
      getLodgeTracks()
        .then((rows) => live && setTracks(rows))
        .catch(() => undefined);
    };
    read();
    const timer = window.setInterval(() => {
      if (calmRef.current && document.visibilityState !== "hidden") read();
    }, TRACK_POLL_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [signedIn]);

  return tracks;
}
