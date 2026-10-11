import { useEffect, useRef, useState, type RefObject } from "react";
import { fightInput } from "../game/scene/fightMotion";
import {
  finishWalkthrough,
  nextStep,
  stepLine,
  walkthroughDone,
  WALKTHROUGH_CHIPS,
  type WalkthroughSnapshot,
  type WalkthroughStep,
} from "../game/walkthrough";

type Props = {
  userId: string;
  caughtTotal: number;
  fishing: boolean;
  phase: WalkthroughSnapshot["phase"];
  nibble: boolean;
  outcome: WalkthroughSnapshot["outcome"];
  surfaceRef: RefObject<HTMLDivElement | null>;
};

/** How often the aim ring and the fight are read; they live outside React. */
const POLL_MS = 150;

export function Walkthrough({ userId, caughtTotal, fishing, phase, nibble, outcome, surfaceRef }: Props) {
  // Decided once per visit, so the first landing does not hide its own send-off.
  const [open, setOpen] = useState(() => caughtTotal === 0 && !walkthroughDone(userId));
  const [step, setStep] = useState<WalkthroughStep>("aim");
  const stepRef = useRef<WalkthroughStep>("aim");
  const [line, setLine] = useState("");
  const props = useRef({ fishing, phase, nibble, outcome });
  props.current = { fishing, phase, nibble, outcome };

  useEffect(() => {
    if (!open) return;
    const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const read = () => {
      const surface = surfaceRef.current;
      const snap: WalkthroughSnapshot = {
        ...props.current,
        cast: surface?.dataset.cast,
        surge: Number(surface?.dataset.surge ?? 0),
        reeling: fightInput.reeling,
        touch,
      };
      const next = nextStep(stepRef.current, snap);
      stepRef.current = next;
      setStep(next);
      setLine(stepLine(next, snap));
    };
    read();
    const timer = window.setInterval(read, POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, fishing, phase, nibble, outcome, surfaceRef]);

  useEffect(() => {
    if (step === "landed") finishWalkthrough(userId);
  }, [step, userId]);

  // The send-off stays with the catch card, then the chips are gone for good.
  useEffect(() => {
    if (step === "landed" && phase !== "result") setOpen(false);
  }, [step, phase]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!open || !surface) return;
    surface.dataset.walkthrough = "1";
    return () => {
      delete surface.dataset.walkthrough;
    };
  }, [open, surfaceRef]);

  if (!open) return null;
  const at = WALKTHROUGH_CHIPS.findIndex((chip) => chip.step === step);

  return (
    <aside className="walkthrough" data-camera-control data-step={step} aria-label="First cast">
      <ol>
        {WALKTHROUGH_CHIPS.map((chip, index) => {
          const state = step === "landed" || index < at ? "done" : index === at ? "now" : "todo";
          return (
            <li key={chip.step} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              {chip.label}
            </li>
          );
        })}
      </ol>
      <p role="status">{line}</p>
      {step !== "landed" && (
        <button
          className="walkthrough-skip"
          type="button"
          onClick={(event) => {
            // Leave Space free for casting.
            event.currentTarget.blur();
            finishWalkthrough(userId);
            setOpen(false);
          }}
        >
          Skip
        </button>
      )}
    </aside>
  );
}
