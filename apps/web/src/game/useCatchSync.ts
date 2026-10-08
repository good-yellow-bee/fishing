import { useCallback, useEffect, useRef, useState } from "react";
import type { CatchSubmission } from "@stillwater/shared";
import { ApiError, getMe, recordCatch, type Me } from "../api";
import {
  clearRejectedCatches,
  isPermanentRejection,
  pendingCatches,
  queueCatch,
  rejectCatch,
  rejectedCatches,
  syncCatches,
} from "./pendingCatches";

/** Matches the server's per-minute catch limit. */
export const RATE_LIMIT_RETRY_MS = 60_000;

const SAVE_FAILED = "The catch could not be saved to the server.";
const OTHER_ANGLER = "Another angler is signed in here. These catches will sync when their owner signs back in.";

function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

type Held = { owner: string; row: CatchSubmission };

function heldFor(owner: string, from: Map<string, Held>) {
  return [...from.values()].filter((item) => item.owner === owner);
}

/** Saves landed catches through the local retry queue, posting only for the account that owns them. */
export function useCatchSync(userId: string | undefined, onMe: (me: Me) => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [error, setError] = useState("");
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const retryTimer = useRef<number | undefined>(undefined);
  // Catches storage refused, by requestId; they live here until a direct post settles them.
  const held = useRef(new Map<string, Held>());
  // Rejections storage could not record either.
  const heldRejections = useRef(new Map<string, Held>());
  const staleProfile = useRef(false);

  const countQueue = useCallback((owner: string) => {
    const queued = pendingCatches(owner);
    const ids = new Set(queued.map((row) => row.requestId));
    setPendingCount(queued.length + heldFor(owner, held.current).filter((item) => !ids.has(item.row.requestId)).length);
    setRejectedCount(rejectedCatches(owner).length + heldFor(owner, heldRejections.current).length);
  }, []);

  /** Reads the session and refuses to act for anyone but the owner of these catches. */
  const signedInOwner = useCallback(async (owner: string) => {
    const me = await getMe();
    if (me.profile.userId !== owner) throw new Error(OTHER_ANGLER);
    onMe(me);
  }, [onMe]);

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
        let failure = "";
        let saved = false;
        let queued = 0;
        try {
          const mine = heldFor(userId, held.current);
          let unreadable: unknown = null;
          try {
            queued = pendingCatches(userId).length;
          } catch (err) {
            unreadable = err;
          }
          if (queued > 0 || mine.length > 0) {
            await signedInOwner(userId);
            for (const item of mine) {
              try {
                await recordCatch(item.row);
              } catch (err) {
                if (!isPermanentRejection(err)) throw err;
                try {
                  rejectCatch(userId, item.row);
                } catch {
                  heldRejections.current.set(item.row.requestId, item);
                }
              }
              held.current.delete(item.row.requestId);
              saved = true;
            }
            if (queued > 0) await syncCatches(userId, recordCatch);
          }
          if (unreadable) throw unreadable;
        } catch (err) {
          failure = message(err, SAVE_FAILED);
          if (err instanceof ApiError && err.status === 429) {
            retryTimer.current = window.setTimeout(() => void sync(), RATE_LIMIT_RETRY_MS);
          }
        }
        try {
          if (pendingCatches(userId).length < queued) saved = true;
          countQueue(userId);
        } catch (err) {
          failure ||= message(err, "Pending catches could not be read.");
        }
        if (saved || (staleProfile.current && !failure)) {
          try {
            await signedInOwner(userId);
            staleProfile.current = false;
          } catch (err) {
            staleProfile.current = true;
            failure ||= err instanceof Error && err.message === OTHER_ANGLER
              ? OTHER_ANGLER
              : `Catch saved. Points will update once the server answers (${message(err, "no response")}).`;
          }
        }
        setError(failure);
      } while (syncAgain.current);
    } finally {
      syncing.current = false;
    }
  }, [countQueue, signedInOwner, userId]);

  /** Resolves false while the catch is neither queued nor saved; sync() keeps retrying it. */
  const saveCatch = useCallback(
    async (row: CatchSubmission) => {
      if (!userId) return false;
      try {
        queueCatch(userId, row);
      } catch (queueError) {
        // Full or blocked storage must not cost the catch: hold it in memory and post it directly.
        console.warn("Catch queue unavailable; saving directly.", queueError);
        held.current.set(row.requestId, { owner: userId, row });
      }
      try {
        countQueue(userId);
      } catch {
        setPendingCount(heldFor(userId, held.current).length);
      }
      await sync();
      return !held.current.has(row.requestId);
    },
    [countQueue, sync, userId],
  );

  const dismissRejected = useCallback(() => {
    if (!userId) return;
    for (const item of heldFor(userId, heldRejections.current)) heldRejections.current.delete(item.row.requestId);
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
