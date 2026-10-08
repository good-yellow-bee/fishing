import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  canUseSpot,
  catchPoints,
  catchStamp,
  dailyConditions,
  fieldLogBestBeat,
  isFishingStance,
  lakeHour,
  lakeHourFromSearch,
  luresPacked,
  sampleLogbook,
  STANCE_LABELS,
  SPOT_LABELS,
  weatherForDay,
  weatherFromSearch,
  type CatchSubmission,
  type SkillId,
} from "@stillwater/shared";
import { buyUpgrade, getMe, type Me } from "../api";
import { FightBar } from "../components/FightBar";
import { Hud } from "../components/Hud";
import { LureChoice } from "../components/LureChoice";
import { UpgradePanel } from "../components/UpgradePanel";
import { saveLandedCatch } from "../field/keepCatch";
import { readTackle } from "../field/gear/storage";
import { readStoredLogbook } from "../field/storage";
import { fx } from "../game/fx";
import { hookWindowMs } from "../game/logic";
import { levelUp, type LevelUp } from "../game/levelUp";
import { defaultLure, lureCanChange } from "../game/lureChoice";
import { FishingWorld } from "../game/scene/FishingWorld";
import { PowerMeter } from "../game/scene/PowerMeter";
import { useFishingGame } from "../game/useFishingGame";
import { useCatchSync } from "../game/useCatchSync";

export function DockPage() {
  const [params] = useSearchParams();
  // One clock for the hour and the day's weather, so both turn over together.
  const [openedAt] = useState(() => new Date());
  const hour = lakeHourFromSearch(params.toString()) ?? lakeHour(openedAt);
  const sky = weatherFromSearch(params.toString()) ?? weatherForDay(openedAt);
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const seenLevel = useRef<number | null>(null);
  const [levelToast, setLevelToast] = useState<LevelUp | null>(null);
  const [lureChoices] = useState(() => luresPacked(readTackle()));
  // Null until the angler picks a lure this session, so the default follows their Strength.
  const [pickedLure, setPickedLure] = useState<string | null>(null);
  const chosenLure = pickedLure ?? defaultLure(lureChoices, me?.profile.strength ?? 1);
  const tiedLure = useRef(chosenLure);
  const game = useFishingGame(me?.profile ?? null, hour, tiedLure, sky);
  const scenePhase = game.outcome ? "result" : game.phase;
  if (lureCanChange(scenePhase)) tiedLure.current = chosenLure;
  const lure = tiedLure.current;
  const lureLocked = !lureCanChange(scenePhase);
  const posted = useRef<string | null>(null);
  const userId = me?.profile.userId;
  const catchSync = useCatchSync(userId, setMe);
  const [fieldSaved, setFieldSaved] = useState(false);
  const [fieldLogError, setFieldLogError] = useState("");
  const fieldBeat = useMemo(() => {
    if (game.outcome?.kind !== "landed") return null;
    const book = readStoredLogbook() ?? sampleLogbook(new Date());
    return fieldLogBestBeat(book, game.outcome.species.name, game.outcome.weight, game.outcome.id);
  }, [game.outcome]);
  const statsRef = useRef(me?.speciesStats ?? []);
  statsRef.current = me?.speciesStats ?? [];
  const stamp = useMemo(() => {
    if (game.outcome?.kind !== "landed") return null;
    return catchStamp(statsRef.current, game.outcome.species.id, game.outcome.weight);
  }, [game.outcome]);

  const refresh = useCallback(() => {
    return getMe().then(setMe);
  }, []);

  const saveOutcome = useCallback(
    async (id: string, row: CatchSubmission) => {
      posted.current = id;
      if (!(await catchSync.saveCatch(row)) && posted.current === id) posted.current = null;
    },
    [catchSync.saveCatch],
  );

  const retryServerSave = () => {
    const outcome = game.outcome;
    if (outcome?.kind === "landed" && posted.current !== outcome.id) {
      void saveOutcome(outcome.id, { requestId: outcome.id, speciesId: outcome.species.id, weight: outcome.weight, spot: outcome.spot, clean: outcome.clean });
      return;
    }
    void catchSync.sync();
  };

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, [refresh]);

  useEffect(() => () => fx.ambient.stop(), []);

  useEffect(() => fx.ambient.setConditions(hour, sky), [hour, sky]);

  const level = me?.level;
  useEffect(() => {
    if (level === undefined) return;
    const rise = levelUp(seenLevel.current, level);
    seenLevel.current = level;
    if (!rise) return;
    fx.land();
    setLevelToast(rise);
  }, [level]);

  useEffect(() => {
    if (!levelToast) return;
    const timer = window.setTimeout(() => setLevelToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [levelToast]);

  const saveFieldLog = useCallback(() => {
    if (game.outcome?.kind !== "landed") return;
    const { id, species, weight, spot: catchSpot } = game.outcome;
    try {
      saveLandedCatch({
        id,
        species: species.name,
        pounds: weight,
        bank: SPOT_LABELS[catchSpot],
        caughtAt: new Date().toISOString(),
        lure: tiedLure.current,
        weather: dailyConditions(openedAt, sky),
      });
      setFieldSaved(true);
      setFieldLogError("");
    } catch (err) {
      setFieldSaved(false);
      setFieldLogError(err instanceof Error ? err.message : "The field log could not be saved.");
    }
  }, [game.outcome, openedAt, sky]);

  useEffect(() => {
    if (game.outcome?.kind !== "landed") {
      posted.current = null;
      setFieldSaved(false);
      setFieldLogError("");
      return;
    }
    const { id, species, weight, spot: catchSpot, clean } = game.outcome;
    if (posted.current === id) return;
    saveFieldLog();
    if (!userId) return;
    void saveOutcome(id, { requestId: id, speciesId: species.id, weight, spot: catchSpot, clean });
  }, [game.outcome, saveFieldLog, saveOutcome, userId]);

  useEffect(() => {
    if (game.stance !== "shop") setShopOpen(false);
  }, [game.stance]);

  useEffect(() => {
    if (game.shopTap) setShopOpen(true);
  }, [game.shopTap]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (event.code === "Escape") {
        setShopOpen(false);
        return;
      }
      if (event.code !== "KeyE" || event.repeat) return;
      if (game.stance !== "shop") return;
      event.preventDefault();
      setShopOpen((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.stance]);

  const onBuy = async (skill: SkillId) => {
    setBusy(true);
    setError("");
    try {
      await buyUpgrade(skill);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "upgrade failed");
    } finally {
      setBusy(false);
    }
  };

  if (!me) {
    return <div className="dock-page">{error || "Walking the planks…"}</div>;
  }

  const dropoffOpen = canUseSpot("dropoff", me.level);
  const fishing = isFishingStance(game.stance);
  const stanceLabel =
    game.stance === "dropoff" && !dropoffOpen ? `${STANCE_LABELS.dropoff} (lv 3)` : STANCE_LABELS[game.stance];

  return (
    <div className="dock-page">
      <Hud profile={me.profile} email={me.user.email} hour={hour} sky={sky} />
      <div
        className="scene-wrap"
        ref={game.surfaceRef}
        data-phase={scenePhase}
        data-points={me.profile.points}
        data-power={game.power.toFixed(2)}
        data-aim-hint={game.aimHint}
        data-nibble={game.nibble ? "1" : "0"}
        data-hour={hour}
        data-sky={sky}
        data-lure={lure}
        data-lure-locked={lureLocked ? "1" : "0"}
      >
        <FishingWorld
          phase={scenePhase}
          power={game.power}
          spot={isFishingStance(game.stance) ? game.stance : game.spot}
          sim={game.sim}
          nibble={game.nibble}
          hour={hour}
          sky={sky}
          species={
            game.outcome?.kind === "landed" ? game.outcome.species : (game.fight?.species ?? null)
          }
          weight={game.outcome?.kind === "landed" ? game.outcome.weight : (game.fight?.weight ?? 0)}
        />
        {game.phase === "hookset" && (
          <div className="strike-cue" role="alert" style={{ "--strike-ms": `${hookWindowMs(me.profile.accuracy)}ms` } as CSSProperties}>
            <strong>Strike!</strong>
            <span>Click or Space</span>
            <i />
          </div>
        )}
        {fishing && !shopOpen && (
          <PowerMeter phase={scenePhase} power={game.power} accuracy={me.profile.accuracy} />
        )}
        <p className="hint">{game.hint}</p>
        {(catchSync.pendingCount > 0 || catchSync.error || catchSync.rejectedCount > 0) && (
          <aside className="catch-sync" data-camera-control role="status">
            {(catchSync.pendingCount > 0 || catchSync.error) && (
              <>
                <p>{catchSync.error || `${catchSync.pendingCount} catch${catchSync.pendingCount === 1 ? "" : "es"} waiting to sync.`}</p>
                <button className="panel-btn" type="button" onClick={retryServerSave}>Retry server save</button>
              </>
            )}
            {catchSync.rejectedCount > 0 && (
              <>
                <p>{catchSync.rejectedCount} catch{catchSync.rejectedCount === 1 ? "" : "es"} could not be verified. Your field-log entries are kept.</p>
                <button className="panel-btn" type="button" onClick={catchSync.dismissRejected}>Dismiss</button>
              </>
            )}
          </aside>
        )}
        <aside className="stance-chip" data-stance={game.stance}>
          {stanceLabel}
        </aside>
        <LureChoice
          choices={lureChoices}
          value={lure}
          locked={lureLocked}
          onChange={(next) => {
            if (lureLocked || !lureChoices.includes(next)) return;
            setPickedLure(next);
          }}
        />
        <aside className="camera-help" data-camera-control>
          <span>Shore</span>
          <kbd>WASD</kbd> walk
          <kbd>Click water</kbd> aim
          <kbd>E</kbd> shop
          <kbd>Right drag</kbd> look
        </aside>
        {game.fight && !game.outcome && <FightBar fight={game.fight} sim={game.sim} performance={game.performance} />}
        {game.outcome?.kind === "landed" && (
          <div className={`landed-card rarity-${game.outcome.species.rarity}`}>
            {fieldBeat && (
              <p className="catch-best" role="status">
                <strong>Personal best</strong>
                <span>{fieldBeat.line}</span>
              </p>
            )}
            <span className="rarity-tag">{game.outcome.species.rarity}</span>
            <h2>{game.outcome.species.name}</h2>
            <p className="catch-lure">{lure}</p>
            <p>{game.outcome.weight.toFixed(1)} lb · {SPOT_LABELS[game.outcome.spot]}</p>
            <p>+{catchPoints(game.outcome.species, game.outcome.weight, game.outcome.clean)} pts</p>
            {game.outcome.clean && <p className="catch-stamp">Clean fight</p>}
            {stamp?.kind === "first" && <p className="catch-stamp">New in the field guide</p>}
            {stamp?.kind === "pb" && (
              <p className="catch-stamp">Personal best · was {stamp.previous.toFixed(1)} lb</p>
            )}
            {stamp?.kind === "repeat" && (
              <p className="catch-stamp quiet">Book PB {stamp.heaviest.toFixed(1)} lb</p>
            )}
            {stamp?.trophy && <p className="catch-stamp">Trophy</p>}
            <div className="catch-actions">
              {fieldSaved && <p className="catch-stamp quiet">Saved in the field log</p>}
              {fieldLogError && (
                <p className="warn" role="alert">
                  {fieldLogError}
                </p>
              )}
              <button className="panel-btn" type="button" onClick={game.dismissResult}>
                Keep fishing
              </button>
              {fieldLogError && (
                <button className="panel-btn" type="button" onClick={saveFieldLog}>
                  Try saving again
                </button>
              )}
              <Link className="panel-btn" to="/catches">
                Field log
              </Link>
            </div>
          </div>
        )}
        {game.outcome && game.outcome.kind !== "landed" && (
          <div className="toast">
            <p>{game.outcome.message}</p>
            <button className="panel-btn" type="button" onClick={game.dismissResult}>
              Cast again
            </button>
          </div>
        )}
        {levelToast && (
          <div className="toast level-toast" role="status">
            <h2>Level {levelToast.level}</h2>
            {levelToast.opened && <p>{levelToast.opened}</p>}
          </div>
        )}
        {shopOpen && (
          <div className="shop-overlay">
            <UpgradePanel profile={me.profile} busy={busy || scenePhase !== "idle"} onBuy={onBuy} />
            <button className="panel-btn" type="button" onClick={() => setShopOpen(false)}>
              Back to the path
            </button>
            {error && <p className="warn">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
