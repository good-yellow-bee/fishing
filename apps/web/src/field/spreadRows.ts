/** At most `count` rows picked evenly from first to last, in their order: a long sorted list read at a glance. */
export function spreadRows<Row>(rows: readonly Row[], count: number): readonly Row[] {
  if (rows.length <= count) return rows;
  if (count <= 1) return rows.slice(0, count);
  // More rows than picks, so every step moves on at least one row and none is picked twice.
  return Array.from({ length: count }, (_, index) => rows[Math.round((index * (rows.length - 1)) / (count - 1))]!);
}
