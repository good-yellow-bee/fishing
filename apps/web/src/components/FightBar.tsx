import { useEffect, useRef } from "react";
import type { FightSim } from "../game/fight";
import type { Fight } from "../game/useFishingGame";

type Props = {
  fight: Fight;
  sim: { current: FightSim | null };
};

const STATUS = ["Hold to reel it in", "It tenses up…", "IT RUNS — ease off!"];

function tensionColor(tension: number) {
  if (tension < 0.55) return "#6a8f5a";
  if (tension < 0.8) return "#d9a94e";
  return "#b85c38";
}

export function FightBar({ fight, sim }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const tensionFill = useRef<HTMLDivElement>(null);
  const lineFill = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const state = sim.current;
      if (state) {
        if (tensionFill.current) {
          tensionFill.current.style.width = `${Math.min(100, state.tension * 100)}%`;
          tensionFill.current.style.background = tensionColor(state.tension);
        }
        if (lineFill.current) {
          lineFill.current.style.width = `${Math.min(100, Math.max(0, (1 - state.line) * 100))}%`;
        }
        if (status.current) status.current.textContent = STATUS[state.surge]!;
        if (card.current) {
          card.current.dataset.surge = String(state.surge);
          card.current.classList.toggle("surging", state.surge === 2);
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [sim]);

  return (
    <div ref={card} className="fight-bar">
      <header>
        <h2>{fight.species.name}</h2>
        <span>{fight.weight.toFixed(1)} lb</span>
      </header>
      {fight.underpowered ? (
        <p className="warn">This fish is too heavy for your line.</p>
      ) : (
        <>
          <span className="fight-label">Tension</span>
          <div className="bar">
            <div ref={tensionFill} className="fill" />
            <i className="tick" style={{ left: "55%" }} />
            <i className="tick" style={{ left: "80%" }} />
          </div>
          <span className="fight-label">Line in</span>
          <div className="bar">
            <div ref={lineFill} className="fill" />
          </div>
          <p ref={status} className="fight-status">
            {STATUS[0]}
          </p>
        </>
      )}
    </div>
  );
}
