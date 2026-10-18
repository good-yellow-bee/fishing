import { useEffect, useMemo, useRef } from "react";
import { canTurnRuns, ESCAPE_LINE, FRAYED_SNAP, fightLines, isCleanFight, jumpLines, RED_TENSION, SHORT_LINE, SOFT_MOUTHS, staminaState, TIGHT_TENSION, tensionZone, type FightPerformance, type FightSim, type StaminaState, type TensionZone } from "../game/fight";
import { habitLines } from "../game/habitLines";
import { useSettings } from "../game/settings";
import type { Fight } from "../game/useFishingGame";
import { useLang, useT } from "../i18n";
import { weightText } from "../i18n/content";

type Props = {
  fight: Fight;
  sim: { current: FightSim | null };
  performance: { current: FightPerformance | null };
  /** The heaviest of this species in the field log, in pounds; a heavier fish on the line says so. */
  best?: number | null;
  /** The hookset's message (or a call made mid-fight), shown for a while at the top of the card, since the hint is hidden in a fight. */
  note?: string | null;
};

const ZONE_COLOR: Record<TensionZone, string> = { easy: "#6a8f5a", tight: "#d9a94e", red: "#b85c38" };
/** Said in words next to the bar, so the zone reads without telling green from red. */
const ZONE_WORD: Record<TensionZone, string> = { easy: "Easy", tight: "Tight", red: "Too tight" };
/** How much fight the fish has left, beside the line bar: its runs weaken and it comes in faster as it tires. */
const STAMINA_WORD: Record<StaminaState, string> = { fresh: "Fish fresh", tiring: "Fish tiring", spent: "Fish played out" };

export function FightBar({ fight, sim, performance, best = null, note = null }: Props) {
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
  const leapLines = useMemo(() => jumpLines(), [lang]);
  const habits = useMemo(() => habitLines(fight.species.id), [fight.species.id, lang]);
  const tensionMeter = useRef<HTMLDivElement>(null);
  const zoneWord = useRef<HTMLSpanElement>(null);
  const lineMeter = useRef<HTMLDivElement>(null);
  const staminaWord = useRef<HTMLSpanElement>(null);
  const steerLine = useRef<HTMLParagraphElement>(null);
  const overrunFill = useRef<HTMLElement>(null);
  const peakMark = useRef<HTMLElement>(null);
  const shortWord = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let spokenAt = -Infinity;
    let spokenShort = false;
    const loop = (now: number) => {
      const state = sim.current;
      if (state) {
        const zone = tensionZone(state.tension);
        if (tensionFill.current) {
          tensionFill.current.style.width = `${Math.min(100, state.tension * 100)}%`;
          tensionFill.current.style.backgroundColor = ZONE_COLOR[zone];
        }
        if (tensionMeter.current && tensionMeter.current.dataset.zone !== zone) {
          tensionMeter.current.dataset.zone = zone;
          if (zoneWord.current) zoneWord.current.textContent = t(ZONE_WORD[zone]);
        }
        const tired = staminaState(state.stamina);
        if (staminaWord.current && staminaWord.current.dataset.stamina !== tired) {
          staminaWord.current.dataset.stamina = tired;
          staminaWord.current.textContent = t(STAMINA_WORD[tired]);
        }
        if (lineFill.current) {
          lineFill.current.style.width = `${Math.min(100, Math.max(0, (1 - state.line) * 100))}%`;
        }
        // Line the fish takes past where it was hooked eats the bar from the right, toward the escape.
        const overrun = Math.min(1, Math.max(0, (state.line - 1) / (ESCAPE_LINE - 1)));
        if (overrunFill.current) overrunFill.current.style.width = `${overrun * 100}%`;
        const short = state.line >= SHORT_LINE;
        // The warning takes the stamina word's place, so a long translation still fits on one line.
        if (shortWord.current && shortWord.current.hidden === short) {
          shortWord.current.hidden = !short;
          if (staminaWord.current) staminaWord.current.hidden = short;
        }
        // Written only on a change, so the live region speaks each new call once.
        const call =
          state.tearing
            ? t("EASE OFF — the hook is tearing out!")
            : state.roll && state.surge === 1
            ? t("Let go now — it's going to roll!")
            : state.roll && state.surge === 2
            ? t("EASE OFF — it's rolling on the line!")
            : state.tailWalk && state.surge === 2
            ? t("BOW — it's tail-walking across the top!")
            : state.firstRun && state.surge === 1
            ? t("Let go now — its first run is the long one!")
            : state.firstRun && state.surge === 2
            ? t("Let it run — the first run is the longest!")
            : state.lastRun && state.encore && state.surge === 1 && !state.jump
            ? t("Not done yet — let go, one more run!")
            : state.lastRun && state.surge === 1 && !state.jump
            ? t("Let go now — it sees the net!")
            : state.surge === 0 && state.shake
              ? t("It's shaking its head — ease off a moment!")
            : state.surge === 0 && state.sulk && state.lifting
              ? t("It's lifting — ease off and pump once more!")
            : state.surge === 0 && state.sulk
              ? t("It's sulking on the bottom — ease off, then pump!")
              : state.surge === 0 && state.weeded
              ? t("It ran into the weeds — reel slow and steady!")
              : state.surge === 0 && state.wrapped
              ? t("It wrapped the line round a piling — ease off till it swings free!")
              : state.surge === 2 && state.downstream
              ? t("It's running with the current — turn it upstream!")
              : state.surge === 2 && state.darted && !state.turning
              ? t("It darted the other way — switch sides!")
              : state.surge === 2 && state.rocky
              ? t("It's dragging the line over the rocks — turn it!")
              : state.surge === 0 && tired === "spent"
              ? t("It's played out — reel it in!")
              : (state.jump ? leapLines : lines)[state.surge]!;
        if (status.current && status.current.textContent !== call) status.current.textContent = call;
        // Screen readers get the bars as meters, refreshed four times a second rather than every frame,
        // ...or at once when the line starts running out.
        if (now - spokenAt >= 250 || short !== spokenShort) {
          spokenAt = now;
          spokenShort = short;
          const percent = Math.round(Math.min(1, state.tension) * 100);
          tensionMeter.current?.setAttribute("aria-valuenow", String(percent));
          tensionMeter.current?.setAttribute("aria-valuetext", `${percent}% · ${t(ZONE_WORD[tensionZone(state.tension)])}`);
          const lineIn = Math.round(Math.min(1, Math.max(0, 1 - state.line)) * 100);
          lineMeter.current?.setAttribute("aria-valuenow", String(lineIn));
          lineMeter.current?.setAttribute(
            "aria-valuetext",
            `${lineIn}% · ${t(STAMINA_WORD[tired])}${short ? ` · ${t("Running out of line!")}` : ""}`,
          );
        }
        // Which way to pull the rod: said once a run is coming, and cheered while it is being turned. A leap or a roll can't be turned.
        const steerCall = state.surge === 0 ? "calm" : state.roll ? "roll" : state.jump ? "leap" : state.turning ? "turning" : state.runSide > 0 ? "left" : "right";
        if (steerLine.current && steerLine.current.dataset.call !== steerCall) {
          steerLine.current.dataset.call = steerCall;
          for (const part of steerLine.current.querySelectorAll<HTMLElement>("[data-for]")) part.hidden = part.dataset.for !== steerCall;
        }
        const record = performance.current;
        // The fight's highest tension stays marked, so the angler sees how near the red they came.
        if (peakMark.current && record) {
          peakMark.current.hidden = false;
          peakMark.current.style.left = `${Math.min(100, record.peakTension * 100)}%`;
          peakMark.current.dataset.zone = tensionZone(record.peakTension);
        }
        if (clean.current && record) {
          const stillClean = isCleanFight(record);
          clean.current.textContent = stillClean ? t("Clean fight · 1.5× points") : t("Clean bonus lost");
          clean.current.classList.toggle("lost", !stillClean);
        }
        if (card.current) {
          card.current.dataset.surge = String(state.surge);
          card.current.dataset.challenge = fight.species.challenge;
          card.current.classList.toggle("surging", state.surge === 2);
          card.current.dataset.jump = state.jump ? "1" : "0";
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [fight.species.challenge, leapLines, lines, performance, sim, t]);

  return (
    <div ref={card} className="fight-bar">
      <header>
        <h2>{t(fight.species.name)}</h2>
        <span>{weightText(fight.weight)}</span>
      </header>
      {best !== null && fight.weight > best && (
        <p className="fight-best">{t("Heavier than your best ({weight})", { weight: weightText(best) })}</p>
      )}
      {note && !fight.underpowered && (
        <p className="fight-note" role="status">
          {note}
        </p>
      )}
      {fight.underpowered ? (
        <p className="warn">{t("This fish is too heavy for your line.")}</p>
      ) : (
        <>
          <span className="fight-label" id="fight-tension-label">
            {t("Tension")}
            <span ref={zoneWord} className="fight-zone" aria-hidden="true">
              {t(ZONE_WORD.easy)}
            </span>
          </span>
          <div
            ref={tensionMeter}
            className="bar"
            role="meter"
            aria-labelledby="fight-tension-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            data-zone="easy"
          >
            {/* The red zone is hatched, so it stands out without colour. */}
            <i className="danger-zone" style={{ left: `${RED_TENSION * 100}%` }} />
            <div ref={tensionFill} className="fill" />
            <i className="tick" style={{ left: `${TIGHT_TENSION * 100}%` }} />
            <i className="tick tick-red" style={{ left: `${RED_TENSION * 100}%` }} />
            {/* A frayed line breaks here, short of the bar's end. */}
            {sim.current?.frayed && <i className="tick tick-frayed" style={{ left: `${FRAYED_SNAP * 100}%` }} title={t("Frayed line: it snaps here")} />}
            <i ref={peakMark} className="peak" hidden />
          </div>
          <span className="fight-label" id="fight-line-label">
            {t("Line in")}
            <span ref={staminaWord} className="fight-stamina" aria-hidden="true" data-stamina="fresh">
              {t(STAMINA_WORD.fresh)}
            </span>
            <span ref={shortWord} className="fight-short" aria-hidden="true" hidden>
              {t("Running out of line!")}
            </span>
          </span>
          <div ref={lineMeter} className="bar" role="meter" aria-labelledby="fight-line-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
            <div ref={lineFill} className="fill" />
            <i ref={overrunFill} className="overrun" />
          </div>
          <p ref={status} className="fight-status" role="status" aria-live="assertive">
            {lines[0]}
          </p>
          {canTurnRuns(fight.species.challenge) && (
          <p ref={steerLine} className="fight-steer" data-call="calm">
            <span data-for="calm">
              <span className="on-pointer">{t("Turn a run: hold ← A or → D the other way")}</span>
              <span className="on-touch">{t("Turn a run: hold the side button the other way")}</span>
              <span className="on-pad">{t("Turn a run: push the left stick the other way")}</span>
            </span>
            <span data-for="left" hidden>
              {t("It runs right — pull left")} <span className="on-pointer">{t("(← or A)")}</span>
              <span className="on-pad">{t("(left stick)")}</span>
            </span>
            <span data-for="right" hidden>
              {t("It runs left — pull right")} <span className="on-pointer">{t("(→ or D)")}</span>
              <span className="on-pad">{t("(left stick)")}</span>
            </span>
            <span data-for="turning" hidden>
              {t("Turning it!")}
            </span>
            <span data-for="leap" hidden>
              {t("A leap can't be turned — just let go")}
            </span>
            <span data-for="roll" hidden>
              {t("A roll can't be turned — just let go")}
            </span>
          </p>
          )}
          {fight.water === "weeds" && <p className="fight-water">{t("Reeds: turn every run, or it goes into the weeds")}</p>}
          {fight.water === "current" && <p className="fight-water">{t("Inlet: the current takes line while you rest, and helps a run downstream")}</p>}
          {fight.water === "deep" && <p className="fight-water">{t("Drop-off: runs dive and pull harder, but tire the fish faster")}</p>}
          {fight.water === "rocks" && <p className="fight-water">{t("Point: turn every run; reeling while it drags over the rocks frays the line")}</p>}
          {fight.water === "pilings" && canTurnRuns(fight.species.challenge) && <p className="fight-water">{t("Dock: turn every run, or it wraps the line round a piling and frays it")}</p>}
          {fight.water === "boat" && <p className="fight-water">{t("Boat: it swings to follow a run, so runs take less line")}</p>}
          {fight.lightHook && !SOFT_MOUTHS.has(fight.species.id) && <p className="fight-water">{t("Hooked light: reel in the red and the hook pulls out")}</p>}
          {habits.map((line) => (
            <p key={line} className="fight-water">
              {line}
            </p>
          ))}
          {fight.windy && (
            <p className="fight-water fight-wind">
              {fight.windy === "strong" ? t("Strong wind: a slack line drifts out much faster") : t("Breezy: a slack line drifts out faster")}
            </p>
          )}
          <p ref={clean} className="fight-clean">{t("Clean fight · 1.5× points")}</p>
          {reelMode === "toggle" ? (
            <p className="fight-controls">
              <span className="on-pointer">{t("TAP click / Space to start reeling")}</span>
              <span className="on-touch">{t("TAP the screen to start reeling")}</span>
              <span className="on-pad">{t("TAP A or RT to start reeling")}</span>
              {" · "}
              {t("TAP again when the fish is about to run or tension goes red")}
            </p>
          ) : (
            <p className="fight-controls">
              <span className="on-pointer">{t("HOLD click / Space to reel")}</span>
              <span className="on-touch">{t("HOLD the screen to reel")}</span>
              <span className="on-pad">{t("HOLD A or RT to reel")}</span>
              {" · "}
              {t("LET GO when the fish is about to run or tension goes red")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
