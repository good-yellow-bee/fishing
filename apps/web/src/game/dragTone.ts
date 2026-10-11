/**
 * The reel's drag, as sound: a low tick-tone that climbs with tension, a rasp
 * once the line nears the red, and a hiss while a running fish takes line.
 * Silence means slack.
 */
export type DragTone = {
  gain: number;
  hz: number;
  /** Close to breaking: under the clean-fight line, so it warns before the red. */
  rasp: boolean;
  /** Line paying out on a run the angler is not reeling against. */
  hiss: boolean;
};

const SLACK = 0.2;
export const RASP_TENSION = 0.72;

export function dragTone(tension: number, surge: number, reeling: boolean): DragTone {
  const load = Math.min(1, Math.max(0, (tension - SLACK) / (1 - SLACK)));
  return {
    gain: load <= 0 ? 0 : 0.004 + load * 0.018,
    hz: 120 + load * 300,
    rasp: tension >= RASP_TENSION,
    hiss: !reeling && surge === 2,
  };
}
