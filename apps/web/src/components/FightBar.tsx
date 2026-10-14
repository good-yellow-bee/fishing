import { useEffect, useMemo, useRef } from "react";
import { fightLines, isCleanFight, RED_TENSION, type FightPerformance, type FightSim } from "../game/fight";
import { useSettings } from "../game/settings";
import type { Fight } from "../game/useFishingGame";
import { oneDecimal } from "../game/logic";
import { useLang, useT } from "../i18n";

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
  const { reelMode } = useSettings();
  const t = useT();
  const lang = useLang();
  const card = useRef<HTMLDivElement>(null);
  const tensionFill = useRef<HTMLDivElement>(null);
  const lineFill = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const clean = useRef<HTMLParagraphElement>(null);
  // A language change reads the lines again.
  const lines = useMemo(() => fightLines(fight.species.challenge), [fight.species.challenge, lang]);
  const tensionMeter = useRef<HTMLDivElement>(null);
  const lineMeter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let spokenAt = -Infinity;
    const loop = (now: number) => {
      const state = sim.current;
      if (state) {
        if (tensionFill.current) {
          tensionFill.current.style.width = `${Math.min(100, state.tension * 100)}%`;
          tensionFill.current.style.background = tensionColor(state.tension);
        }
        if (lineFill.current) {
          lineFill.current.style.width = `${Math.min(100, Math.max(0, (1 - state.line) * 100))}%`;
        }
        // Written only on a change, so the live region speaks each new call once.
        if (status.current && status.current.textContent !== lines[state.surge]) status.current.textContent = lines[state.surge]!;
        // Screen readers get the bars as meters, refreshed four times a second rather than every frame.
        if (now - spokenAt >= 250) {
          spokenAt = now;
          tensionMeter.current?.setAttribute("aria-valuenow", String(Math.round(Math.min(1, state.tension) * 100)));
          lineMeter.current?.setAttribute("aria-valuenow", String(Math.round(Math.min(1, Math.max(0, 1 - state.line)) * 100)));
        }
        const record = performance.current;
        if (clean.current && record) {
          const stillClean = isCleanFight(record);
          clean.current.textContent = stillClean ? t("Clean fight · 1.5× points") : t("Clean bonus lost");
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
  }, [fight.species.challenge, lines, performance, sim, t]);

  return (
    <div ref={card} className="fight-bar">
      <header>
        <h2>{t(fight.species.name)}</h2>
        <span>{oneDecimal(fight.weight)} lb</span>
      </header>
      {fight.underpowered ? (
        <p className="warn">{t("This fish is too heavy for your line.")}</p>
      ) : (
        <>
          <span className="fight-label" id="fight-tension-label">{t("Tension")}</span>
          <div
            ref={tensionMeter}
            className="bar"
            role="meter"
            aria-labelledby="fight-tension-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <div ref={tensionFill} className="fill" />
            <i className="tick" style={{ left: "55%" }} />
            <i className="tick" style={{ left: "80%" }} />
          </div>
          <span className="fight-label" id="fight-line-label">{t("Line in")}</span>
          <div ref={lineMeter} className="bar" role="meter" aria-labelledby="fight-line-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
            <div ref={lineFill} className="fill" />
          </div>
          <p ref={status} className="fight-status" role="status" aria-live="assertive">
            {lines[0]}
          </p>
          <p ref={clean} className="fight-clean">{t("Clean fight · 1.5× points")}</p>
          {reelMode === "toggle" ? (
            <p className="fight-controls">
              <span className="on-pointer">{t("TAP click / Space to start reeling")}</span>
              <span className="on-touch">{t("TAP the screen to start reeling")}</span>
              {" · "}
              {t("TAP again when the fish is about to run or tension goes red")}
            </p>
          ) : (
            <p className="fight-controls">
              <span className="on-pointer">{t("HOLD click / Space to reel")}</span>
              <span className="on-touch">{t("HOLD the screen to reel")}</span>
              {" · "}
              {t("LET GO when the fish is about to run or tension goes red")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
