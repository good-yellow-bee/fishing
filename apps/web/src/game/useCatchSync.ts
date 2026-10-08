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
export function useCatchSync(userId: string | undefined, onMe: (me: Me) => void, onRefreshError: (message: string) => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [error, setError] = useState("");
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const retryTimer = useRef<number | undefined>(undefined);

  const countQueue = useCallback((owner: string) => {
    setPendingCount(pendingCatches(owner).length);
    setRejectedCount(rejectedCatches(owner).length);
  }, []);

  const refresh = useCallback(() => getMe().then(onMe, (err: unknown) => onRefreshError(message(err, "Profile refresh failed."))), [onMe, onRefreshError]);

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
        setError("");
        let queued = 0;
        try {
          queued = pendingCatches(userId).length;
          if (queued > 0) {
            const me = await getMe();
            onMe(me);
            if (me.profile.userId !== userId) {
              throw new Error("Another angler is signed in here. These catches will sync when their owner signs back in.");
            }
            await syncCatches(userId, recordCatch);
          }
        } catch (err) {
          setError(message(err, SAVE_FAILED));
          if (err instanceof ApiError && err.status === 429) {
            retryTimer.current = window.setTimeout(() => void sync(), RATE_LIMIT_RETRY_MS);
          }
        }
        let remaining = queued;
        try {
          remaining = pendingCatches(userId).length;
          countQueue(userId);
        } catch (err) {
          setError(message(err, "Pending catches could not be read."));
        }
        if (remaining < queued) await refresh();
      } while (syncAgain.current);
    } finally {
      syncing.current = false;
    }
  }, [countQueue, onMe, refresh, userId]);

  /** Resolves false when the catch is neither queued nor saved, so the caller can offer a retry. */
  const saveCatch = useCallback(
    async (row: CatchSubmission) => {
      if (!userId) return false;
      try {
        queueCatch(userId, row);
      } catch (queueError) {
        // Full or blocked storage must not cost the catch: post it directly, the server dedupes by requestId.
        console.warn("Catch queue unavailable; saving directly.", queueError);
        try {
          await recordCatch(row);
        } catch (err) {
          setError(message(err, SAVE_FAILED));
          return false;
        }
        await refresh();
        return true;
      }
      setPendingCount(pendingCatches(userId).length);
      await sync();
      return true;
    },
    [refresh, sync, userId],
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
