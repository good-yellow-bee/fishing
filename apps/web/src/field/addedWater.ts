/**
 * A water just added from a catch or outing form's "Add a spot", for the form it was added for to pick when it opens
 * again (by Back, or in the water form's place).
 */
let added: string | null = null;

export function noteAddedWater(id: string) {
  added = id;
}

/** Read as the form first draws; the form lets it go once drawn, so a later form starts as usual. */
export function addedWater(): string | null {
  return added;
}

export function forgetAddedWater() {
  added = null;
}
