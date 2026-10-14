/**
 * The x turn that gives a creature facing +z the pose's pitch, where a
 * negative pitch means nose down. Three turns +z upward for a negative x
 * turn, so the pitch goes in negated.
 */
export function pitchTurn(pitch: number) {
  return -pitch;
}
