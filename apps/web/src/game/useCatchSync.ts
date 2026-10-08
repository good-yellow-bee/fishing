import { useCallback, useEffect, useRef, useState } from "react";
import type { CatchSubmission } from "@stillwater/shared";
import { ApiError, getMe, recordCatch, type Me } from "../api";
import { clearRejectedCatches, pendingCatches, queueCatch, rejectedCatches, syncCatches } from "./pendingCatches";

/** Matches the server's per-minute catch limit. */
export const RATE_LIMIT_RETRY_MS = 60_000;

const SAVE_FAILED = "The catch could not be saved to the server.";

function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/** Saves landed catches through the local retry queue, posting only for the account that owns the queue. */
export function useCatchSync(userId: string | undefined, onMe: (me: Me) => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [error, setError] = useState("");
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const retryTimer = useRef<number | undefined>(undefined);
  // A catch storage refused to queue; it lives here until a direct post succeeds.
  const unsaved = useRef<CatchSubmission | null>(null);
  const staleProfile = useRef(false);

  const countQueue = useCallback((owner: string) => {
    setPendingCount(pendingCatches(owner).length + (unsaved.current ? 1 : 0));
    setRejectedCount(rejectedCatches(owner).length);
  }, []);

  const sync = useCallback(async () => {
    if (!userId) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    window.clearTimeout(retryTimer.current);
    try {
      do {
        syncAgain.current = false;
        // Each pass reports only its own failures, so an error never outlives the work it was about.
        setError("");
        let saved = false;
        try {
          const queued = pendingCatches(userId).length;
          const direct = unsaved.current;
          if (queued > 0 || direct) {
            const me = await getMe();
            if (me.profile.userId !== userId) {
              throw new Error("Another angler is signed in here. These catches will sync when their owner signs back in.");
            }
            onMe(me);
            if (direct) {
              await recordCatch(direct);
              unsaved.current = null;
              saved = true;
            }
            if (queued > 0) {
              await syncCatches(userId, recordCatch);
              saved = true;
            }
          }
        } catch (err) {
          setError(message(err, SAVE_FAILED));
          if (err instanceof ApiError && err.status === 429) {
            retryTimer.current = window.setTimeout(() => void sync(), RATE_LIMIT_RETRY_MS);
          }
        }
        try {
          countQueue(userId);
        } catch (err) {
          setError(message(err, "Pending catches could not be read."));
        }
        if (saved || staleProfile.current) {
          try {
            onMe(await getMe());
            staleProfile.current = false;
          } catch (err) {
            staleProfile.current = true;
            setError(`Catch saved. Points will update once the server answers (${message(err, "no response")}).`);
          }
        }
      } while (syncAgain.current);
    } finally {
      syncing.current = false;
    }
  }, [countQueue, onMe, userId]);

  /** Resolves false when the catch is neither queued nor saved yet; sync() keeps retrying it. */
  const saveCatch = useCallback(
    async (row: CatchSubmission) => {
      if (!userId) return false;
      try {
        queueCatch(userId, row);
      } catch (queueError) {
        // Full or blocked storage must not cost the catch: hold it in memory and post it directly.
        console.warn("Catch queue unavailable; saving directly.", queueError);
        unsaved.current = row;
      }
      await sync();
      return unsaved.current?.requestId !== row.requestId;
    },
    [sync, userId],
  );

  const dismissRejected = useCallback(() => {
    if (!userId) return;
    try {
      clearRejectedCatches(userId);
      setRejectedCount(0);
    } catch (err) {
      setError(message(err, "Rejected catches could not be cleared."));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      countQueue(userId);
    } catch (err) {
      setError(message(err, "Pending catches could not be read."));
      return;
    }
    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearTimeout(retryTimer.current);
    };
  }, [countQueue, sync, userId]);

  return { pendingCount, rejectedCount, error, saveCatch, sync, dismissRejected };
}
