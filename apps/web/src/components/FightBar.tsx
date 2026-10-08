import { useEffect, useRef } from "react";
import { FIGHT_LINES, isCleanFight, RED_TENSION, type FightPerformance, type FightSim } from "../game/fight";
import type { Fight } from "../game/useFishingGame";

type Props = {
  fight: Fight;
  sim: { current: FightSim | null };
  performance: { current: FightPerformance | null };
};

function tensionColor(tension: number) {
  if (tension < 0.55) return "#6a8f5a";
  if (tension < RED_TENSION) return "#d9a94e";
  return "#b85c38";
}

export function FightBar({ fight, sim, performance }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const tensionFill = useRef<HTMLDivElement>(null);
  const lineFill = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const clean = useRef<HTMLParagraphElement>(null);
  const lines = FIGHT_LINES[fight.species.challenge];

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
        if (status.current) status.current.textContent = lines[state.surge]!;
        const record = performance.current;
        if (clean.current && record) {
          const stillClean = isCleanFight(record);
          clean.current.textContent = stillClean ? "Clean fight · 1.5× points" : "Clean bonus lost";
          clean.current.classList.toggle("lost", !stillClean);
        }
        if (card.current) {
          card.current.dataset.surge = String(state.surge);
          card.current.dataset.challenge = fight.species.challenge;
          card.current.classList.toggle("surging", state.surge === 2);
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [fight.species.challenge, lines, performance, sim]);

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
            {lines[0]}
          </p>
          <p ref={clean} className="fight-clean">Clean fight · 1.5× points</p>
          <p className="fight-controls">
            <span className="on-pointer">HOLD click / Space to reel</span>
            <span className="on-touch">HOLD the screen to reel</span>
            {" · "}LET GO when tension goes red or the fish runs
          </p>
        </>
      )}
    </div>
  );
}
