import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  canUseSpot,
  catchPoints,
  catchStamp,
  dailyConditions,
  fieldLogBestBeat,
  isFishingStance,
  badgeById,
  lodgeStamp,
  type SpeciesRecord,
  LAKE_HOUR_BLURB,
  lakeHour,
  lakeHourFromSearch,
  luresPacked,
  sampleLogbook,
  STANCE_LABELS,
  SPOT_LABELS,
  weatherForDay,
  weatherFromSearch,
  type CatchSubmission,
  type LakeHour,
  type SkillId,
} from "@stillwater/shared";
import { buyUpgrade, getMe, getSpeciesRecords, type Me } from "../api";
import { DailyRequestsPanel } from "../components/DailyRequestsPanel";
import { FightBar } from "../components/FightBar";
import { Hud } from "../components/Hud";
import { ForecastBoard } from "../components/ForecastBoard";
import { LureChoice } from "../components/LureChoice";
import { UpgradePanel } from "../components/UpgradePanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { Walkthrough } from "../components/Walkthrough";
import { saveLandedCatch } from "../field/keepCatch";
import { readTackle } from "../field/gear/storage";
import { readStoredLogbook } from "../field/storage";
import { fx } from "../game/fx";
import { hookWindowMs, isMercy } from "../game/logic";
import { useBadgeToast } from "../game/useBadgeToast";
import { useLodgeTracks } from "../game/useLodgeTracks";
import { trackLabel } from "../game/scene/shoreTracks";
import { useLevelToast } from "../game/useLevelToast";
import { defaultLure, lureCanChange } from "../game/lureChoice";
import { FishingWorld } from "../game/scene/FishingWorld";
import { walkAnglerTo } from "../game/scene/pose";
import { WALK_TARGETS, type WalkTarget } from "../game/scene/walkPath";
import { PowerMeter } from "../game/scene/PowerMeter";
import { prefersReducedMotion } from "../game/scene/reducedMotion";
import { useFishingGame } from "../game/useFishingGame";
import { useCatchSync } from "../game/useCatchSync";
import { settings as savedSettings, updateSettings, useSettings } from "../game/settings";

/** How often the page reads the clock for a new lake hour. */
const HOUR_CHECK_MS = 30_000;
/** The veil darkens, the hour swaps under it, then it lifts. */
const HOUR_SWAP_MS = 1_100;
const HOUR_VEIL_MS = 3_200;

const HOUR_TURN_LINE: Record<LakeHour, string> = {
  dawn: "Dawn breaks over the lake.",
  day: "The sun is up.",
  dusk: "Dusk settles on the water.",
  night: "Night falls.",
};

const SIGNPOSTS: readonly { target: WalkTarget; label: string }[] = [
  { target: "dock", label: STANCE_LABELS.dock },
  { target: "point", label: STANCE_LABELS.point },
  { target: "reeds", label: STANCE_LABELS.reeds },
  { target: "dropoff", label: STANCE_LABELS.dropoff },
  { target: "shop", label: "Shack" },
];

export function DockPage() {
  const [params] = useSearchParams();
  // One clock for the hour and the day's weather, so both turn over together.
  const [openedAt] = useState(() => new Date());
  const forcedHour = lakeHourFromSearch(params.toString());
  // The real clock keeps running while you fish; ?hour= pins it for testing.
  const [liveHour, setLiveHour] = useState(() => lakeHour(openedAt));
  const [turningTo, setTurningTo] = useState<LakeHour | null>(null);
  const [veil, setVeil] = useState<LakeHour | null>(null);
  const hour = forcedHour ?? liveHour;
  const sky = weatherFromSearch(params.toString()) ?? weatherForDay(openedAt);
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const [lureChoices] = useState(() => luresPacked(readTackle()));
  // The lure from last visit if it is still packed; otherwise null, so the default follows their Strength.
  const [pickedLure, setPickedLure] = useState<string | null>(() =>
    savedSettings.lastLure && lureChoices.includes(savedSettings.lastLure) ? savedSettings.lastLure : null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const shopPanel = useRef<HTMLDivElement>(null);
  const prefs = useSettings();
  const chosenLure = pickedLure ?? defaultLure(lureChoices, me?.profile.strength ?? 1);
  const tiedLure = useRef(chosenLure);
  const caughtTotal = me?.speciesStats.reduce((sum, stat) => sum + stat.caught, 0) ?? 0;
  const mercy = isMercy(caughtTotal);
  const game = useFishingGame(me?.profile ?? null, hour, tiedLure, sky, mercy);
  const scenePhase = game.outcome ? "result" : game.phase;
  // One fish from the rise under the bobber through the fight to the hand, or the turn-away on a miss.
  const shownFish =
    game.outcome?.kind === "landed" ? game.outcome : game.outcome?.kind === "miss" ? (game.outcome.fish ?? null) : (game.fight ?? game.bite);
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
  // Read before the catch is saved, so a new record can name the one it beat; read again after each save.
  const [records, setRecords] = useState<SpeciesRecord[] | null>(null);
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const lastCatch = me?.catches[0]?.id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    getSpeciesRecords()
      .then((rows) => live && setRecords(rows))
      .catch(() => live && setRecords(null));
    return () => {
      live = false;
    };
  }, [userId, lastCatch]);
  const lodge = useMemo(() => {
    if (game.outcome?.kind !== "landed" || !recordsRef.current || !userId) return null;
    return lodgeStamp(recordsRef.current, game.outcome.species.id, game.outcome.weight, userId);
  }, [game.outcome, userId]);

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
      void saveOutcome(outcome.id, { requestId: outcome.id, speciesId: outcome.species.id, weight: outcome.weight, spot: outcome.spot, clean: outcome.clean, hour, sky });
      return;
    }
    void catchSync.sync();
  };

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, [refresh]);

  useEffect(() => () => fx.ambient.stop(), []);

  useEffect(() => fx.ambient.setConditions(hour, sky), [hour, sky]);

  useEffect(() => {
    fx.enabled = !prefs.muted;
    fx.volume = prefs.volume;
  }, [prefs.muted, prefs.volume]);

  // The page's CSS mirrors the system reduced-motion rules under this flag.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.reduceMotion) root.dataset.reduceMotion = "1";
    else delete root.dataset.reduceMotion;
    return () => {
      delete root.dataset.reduceMotion;
    };
  }, [prefs.reduceMotion]);

  // Held while a strike, fight, result, or the shop is up so it never covers them; the 4s only run while shown.
  const bankClear = !shopOpen && (scenePhase === "idle" || scenePhase === "casting" || scenePhase === "waiting");
  const shownLevel = useLevelToast(me?.level, bankClear);
  // A level-up has the floor first; the badge waits its turn behind it.
  const shownBadges = useBadgeToast(me?.badges, bankClear && !shownLevel);

  // Watch the clock; a new lake hour waits for a calm moment so it never lands mid-strike or mid-fight.
  useEffect(() => {
    if (forcedHour) return;
    const check = () => {
      const now = lakeHour(new Date());
      setTurningTo(now === liveHour ? null : now);
    };
    const timer = window.setInterval(check, HOUR_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [forcedHour, liveHour]);

  const calmForTurn = scenePhase === "idle" || scenePhase === "waiting" || scenePhase === "result";
  const tracks = useLodgeTracks(Boolean(userId), calmForTurn);
  useEffect(() => {
    if (!turningTo || !calmForTurn) return;
    setVeil(turningTo);
    // The swap lands under the darkest moment of the veil; with reduced motion there is no veil to wait for.
    const swap = window.setTimeout(
      () => {
        setLiveHour(turningTo);
        setTurningTo(null);
      },
      prefersReducedMotion() || savedSettings.reduceMotion ? 0 : HOUR_SWAP_MS,
    );
    return () => window.clearTimeout(swap);
  }, [turningTo, calmForTurn]);

  useEffect(() => {
    if (!veil) return;
    const lift = window.setTimeout(() => setVeil(null), HOUR_VEIL_MS);
    return () => window.clearTimeout(lift);
  }, [veil]);

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
    void saveOutcome(id, { requestId: id, speciesId: species.id, weight, spot: catchSpot, clean, hour, sky });
  }, [game.outcome, saveFieldLog, saveOutcome, userId, hour, sky]);

  useEffect(() => {
    if (game.stance !== "shop") setShopOpen(false);
  }, [game.stance]);

  useEffect(() => {
    if (game.shopTap) setShopOpen(true);
  }, [game.shopTap]);

  // Keyboard players land inside the shack and go back where they were when it closes.
  useEffect(() => {
    if (!shopOpen) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // The panel itself, not its first button: a stray Space must not buy an upgrade.
    shopPanel.current?.focus();
    return () => {
      if (before?.isConnected) before.focus();
    };
  }, [shopOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (event.code === "Escape") {
        setShopOpen(false);
        setSettingsOpen(false);
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
  const bank = isFishingStance(game.stance) ? game.stance : game.spot;
  const stanceLabel =
    game.stance === "dropoff" && !dropoffOpen ? `${STANCE_LABELS.dropoff} (lv 3)` : STANCE_LABELS[game.stance];

  return (
    <div className="dock-page">
      <Hud profile={me.profile} hour={hour} sky={sky} onSettings={() => setSettingsOpen(true)} />
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
          level={me.level}
          phase={scenePhase}
          spot={bank}
          sim={game.sim}
          nibble={game.nibble}
          hour={hour}
          sky={sky}
          species={shownFish?.species ?? null}
          weight={shownFish?.weight ?? 0}
          hotspot={game.hotspot}
          tracks={tracks}
          powerRef={game.powerRef}
          accuracy={me.profile.accuracy}
        />
        {game.phase === "hookset" && (
          <div className="strike-cue" role="alert" style={{ "--strike-ms": `${hookWindowMs(me.profile.accuracy, mercy)}ms` } as CSSProperties}>
            <strong>Strike!</strong>
            <span className="cue-keys">Click or Space</span>
            <span className="cue-touch">Tap anywhere</span>
            <i />
          </div>
        )}
        {(scenePhase === "waiting" || scenePhase === "hookset" || scenePhase === "fight") && (
          // Space and a tap on the water do the same; this is just where a thumb rests on a phone.
          <button className="thumb-strike" type="button" data-thumb-strike data-phase={scenePhase} tabIndex={-1} aria-hidden>
            {scenePhase === "fight" ? "Reel" : "Strike"}
          </button>
        )}
        {fishing && !shopOpen && (
          <PowerMeter phase={scenePhase} power={game.power} accuracy={me.profile.accuracy} />
        )}
        <p className="hint" aria-live="polite">
          {game.hint}
        </p>
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
        <Walkthrough
          userId={me.profile.userId}
          caughtTotal={caughtTotal}
          fishing={fishing}
          phase={scenePhase}
          nibble={game.nibble}
          outcome={game.outcome?.kind ?? null}
          surfaceRef={game.surfaceRef}
        />
        <aside className="stance-chip" data-stance={game.stance}>
          {stanceLabel}
        </aside>
        <LureChoice
          choices={lureChoices}
          value={lure}
          spot={bank}
          locked={lureLocked}
          onChange={(next) => {
            if (lureLocked || !lureChoices.includes(next)) return;
            setPickedLure(next);
            updateSettings({ lastLure: next });
          }}
        />
        {scenePhase === "idle" && !shopOpen && (
          <nav className="walk-signs" data-camera-control aria-label="Walk to">
            {game.stance === "shop" && (
              <button className="panel-btn walk-shop" type="button" onClick={() => setShopOpen(true)}>
                Open shop
              </button>
            )}
            {SIGNPOSTS.map(({ target, label }) => (
              <button
                key={target}
                className="panel-btn"
                type="button"
                aria-current={game.stance === target ? "location" : undefined}
                disabled={game.stance === target}
                onClick={(event) => {
                  // Leave Space free for casting.
                  event.currentTarget.blur();
                  walkAnglerTo(WALK_TARGETS[target].x, WALK_TARGETS[target].z);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        <aside className="camera-help" data-camera-control>
          <span>Shore</span>
          <kbd>WASD</kbd> or <kbd>Click shore</kbd> walk
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
            {lodge?.kind === "first" && <p className="catch-stamp">First on the lodge wall</p>}
            {lodge?.kind === "record" && (
              <p className="catch-stamp">
                Lodge record · {lodge.yours ? `beat your ${lodge.previous.toFixed(1)} lb` : `was ${lodge.previous.toFixed(1)} lb (${lodge.holder})`}
              </p>
            )}
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
        {bankClear && tracks.length > 0 && (
          <aside className="lodge-tracks" aria-label="Lately on the lake">
            <span className="eyebrow">Lately on the lake</span>
            {tracks.slice(0, 2).map((track) => (
              <p key={track.id}>{trackLabel(track, Date.now())}</p>
            ))}
          </aside>
        )}
        {veil && (
          <div className="hour-veil" key={veil} role="status">
            <strong>{HOUR_TURN_LINE[veil]}</strong>
            <span>{LAKE_HOUR_BLURB[veil]}</span>
          </div>
        )}
        {/* Mounted empty so screen readers announce the toast when it fills in. */}
        <div className="level-status" role="status">
          {shownLevel && (
            <div className="toast level-toast">
              <h2>Level {shownLevel.level}</h2>
              {shownLevel.opened && <p>{shownLevel.opened}</p>}
            </div>
          )}
          {shownBadges && (
            <div className="toast level-toast badge-toast">
              <span className="eyebrow">{shownBadges.length > 1 ? "Badges" : "Badge"}</span>
              <h2>{shownBadges.map((id) => badgeById(id)?.label ?? id).join(" · ")}</h2>
              {shownBadges.length === 1 && <p>{badgeById(shownBadges[0])?.blurb}</p>}
            </div>
          )}
        </div>
        {shopOpen && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-label="The shack" ref={shopPanel} tabIndex={-1}>
            <UpgradePanel profile={me.profile} busy={busy || scenePhase !== "idle"} onBuy={onBuy} />
            <DailyRequestsPanel key={userId} catchKey={me.catches[0]?.id} onClaimed={refresh} />
            <ForecastBoard />
            <button className="panel-btn" type="button" onClick={() => setShopOpen(false)}>
              Back to the path
            </button>
            {error && <p className="warn">{error}</p>}
          </div>
        )}
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
