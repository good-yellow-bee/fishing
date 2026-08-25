import { useEffect, useRef, useState } from "react";

type Prompt = "space" | "click" | "hold";

type Props = {
  length: number;
  ms: number;
  onSuccess: () => void;
  onFail: () => void;
};

function nextPrompt(random = Math.random): Prompt {
  const roll = random();
  if (roll < 0.34) return "space";
  if (roll < 0.67) return "click";
  return "hold";
}

const labels: Record<Prompt, string> = {
  space: "SPACE",
  click: "CLICK",
  hold: "HOLD SPACE",
};

export function SequenceChallenge({ length, ms, onSuccess, onFail }: Props) {
  const [left, setLeft] = useState(length);
  const [prompt, setPrompt] = useState<Prompt>(() => nextPrompt());
  const [deadline, setDeadline] = useState(ms);
  const holdFrom = useRef<number | null>(null);
  const leftRef = useRef(length);
  const promptRef = useRef(prompt);
  const done = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);
  promptRef.current = prompt;
  onSuccessRef.current = onSuccess;
  onFailRef.current = onFail;

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const remain = ms - (performance.now() - started);
      setDeadline(Math.max(0, remain));
      if (remain <= 0 && !done.current) {
        done.current = true;
        onFailRef.current();
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [ms, prompt]);

  const advance = () => {
    if (done.current) return;
    leftRef.current -= 1;
    if (leftRef.current <= 0) {
      done.current = true;
      onSuccessRef.current();
      return;
    }
    setLeft(leftRef.current);
    setPrompt(nextPrompt());
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      if (promptRef.current === "space") advanceRef.current();
      else if (promptRef.current === "hold") holdFrom.current = performance.now();
      else onFailRef.current();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (promptRef.current !== "hold" || holdFrom.current == null) return;
      const held = performance.now() - holdFrom.current;
      holdFrom.current = null;
      if (held >= 380) advanceRef.current();
      else onFailRef.current();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <div>
      <p>
        {left} cues left · {(deadline / 1000).toFixed(1)}s
      </p>
      <div className="seq-prompt">{labels[prompt]}</div>
      <button className="mash-btn" type="button" onClick={() => (prompt === "click" ? advance() : onFailRef.current())}>
        Click
      </button>
    </div>
  );
}
