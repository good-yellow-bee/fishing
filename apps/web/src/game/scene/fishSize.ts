/** Body size of a fish of this weight, as a multiple of the rising fish's mesh. Past 1.2 the body no longer fits under the dock shelf. */
export function fishSize(weight: number) {
  return 0.7 + 0.5 * Math.min(1, Math.sqrt(Math.max(0, weight) / 25));
}

/** Group scale of the landed fish. Never under 0.95, so a shiner still reads in the hand. */
export function landedScale(weight: number) {
  return 0.95 + (fishSize(weight) - 0.7) * 1.1;
}
