import { useEffect, useRef, useState, type RefObject } from "react";
import { fightInput } from "../game/scene/fightMotion";
import { useT } from "../i18n";
import {
  chipLabel,
  finishWalkthrough,
  nextStep,
  reelLine,
  stepLine,
  walkthroughAgain,
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
  /** Asked for again from Settings this visit. */
  again?: boolean;
};

/** How often the aim ring and the fight are read; they live outside React. */
const POLL_MS = 150;

export function Walkthrough({ userId, caughtTotal, fishing, phase, nibble, outcome, surfaceRef, again = false }: Props) {
  // Decided once per visit, so the first landing does not hide its own send-off.
  const t = useT();
  const [open, setOpen] = useState(() => again || walkthroughAgain(userId) || (caughtTotal === 0 && !walkthroughDone(userId)));
  const [step, setStep] = useState<WalkthroughStep>("aim");
  const stepRef = useRef<WalkthroughStep>("aim");
  const [line, setLine] = useState("");
  const coachRef = useRef<HTMLElement>(null);
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

  // Held sideways, a wait hint opened past Read more stops under the coach as well as the bank chip.
  useEffect(() => {
    const surface = surfaceRef.current;
    const coach = coachRef.current;
    if (!open || !surface || !coach || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => surface.style.setProperty("--coach-h", `${coach.offsetHeight}px`));
    observer.observe(coach);
    return () => {
      observer.disconnect();
      surface.style.removeProperty("--coach-h");
    };
  }, [open, surfaceRef]);

  if (!open) return null;
  const at = WALKTHROUGH_CHIPS.findIndex((chip) => chip.step === step);

  return (
    <aside className="walkthrough" ref={coachRef} data-camera-control data-step={step} aria-label={t("First cast")}>
      <ol>
        {WALKTHROUGH_CHIPS.map((chip, index) => {
          const state = step === "landed" || index < at ? "done" : index === at ? "now" : "todo";
          return (
            <li key={chip.step} data-state={state} aria-current={state === "now" ? "step" : undefined}>
              {chipLabel(chip.step)}
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true">{line}</p>
      {/* In the fight the line turns with every run, which the fight card already calls out at once: a screen reader
          hears the fight's first line and no more, not each step twice. */}
      <span className="sr-only" role="status">
        {step === "ease" ? reelLine() : line}
      </span>
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
          {t("Skip")}
        </button>
      )}
    </aside>
  );
}
