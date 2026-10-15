type StorageKeeper = { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> };

let asked = false;

/**
 * Ask the browser once per visit to keep this site's storage, so a full disk
 * or a clean-up of quiet sites doesn't wipe the book. Called when the player
 * keeps a catch of their own, the moment the book becomes worth keeping (the
 * sample book never asks). Never throws.
 */
export async function keepBookStorage(storage: StorageKeeper | undefined = globalThis.navigator?.storage) {
  if (asked || !storage?.persist) return false;
  asked = true;
  try {
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

/** For tests: forget that this visit already asked. */
export function forgetKeepAsked() {
  asked = false;
}
