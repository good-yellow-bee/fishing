import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  canUseSpot,
  DROPOFF_LEVEL,
  INLET_LEVEL,
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
  lakeSeason,
  seasonFromSearch,
  weeklyBonus,
  GOLDEN_BONUS,
  isGolden,
  LAKE_HOUR_LABELS,
  SKY_LABELS,
  SEASON_LABELS,
  luresPacked,
  keepPlayTrip,
  localDate,
  streakDays,
  sampleLogbook,
  STANCE_LABELS,
  SPOT_LABELS,
  weatherForDay,
  weatherFromSearch,
  type CatchSubmission,
  type LakeHour,
  type SkillId,
} from "@stillwater/shared";
import { buyUpgrade, errorText, getMe, getSpeciesRecords, releaseCatch, type Me } from "../api";
import { DailyRequestsPanel } from "../components/DailyRequestsPanel";
import { FightBar } from "../components/FightBar";
import { FishMark } from "../components/FishMark";
import { useGamepad } from "../game/useGamepad";
import { Hud } from "../components/Hud";
import { ForecastBoard } from "../components/ForecastBoard";
import { LureChoice } from "../components/LureChoice";
import { UpgradePanel } from "../components/UpgradePanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { Walkthrough } from "../components/Walkthrough";
import { saveLandedCatch, saveLandedPhoto } from "../field/keepCatch";
import { readTackle } from "../field/gear/storage";
import { useEffectsSteppedDown } from "../game/frameWatch";
import { readStoredLogbook, saveLogbook } from "../field/storage";
import { fx } from "../game/fx";
import { hookWindowMs, isMercy } from "../game/logic";
import { useBadgeToast } from "../game/useBadgeToast";
import { loadSession, saveSession, sessionTitle, startSession, withSessionFish, type SessionDraft } from "../game/session";
import { TripRecap } from "../components/TripRecap";
import { useLodgeTracks } from "../game/useLodgeTracks";
import { trackLabel } from "../game/scene/shoreTracks";
import { useLevelToast } from "../game/useLevelToast";
import { defaultLure, lureCanChange } from "../game/lureChoice";
import { FishingWorld } from "../game/scene/FishingWorld";
import { walkAnglerTo } from "../game/scene/pose";
import { aboard, boatMode, rowBack, rowOut, subscribeBoat } from "../game/scene/boat";
import { latestCatchShot, subscribeCatchShot } from "../game/scene/catchPhoto";
import { WALK_TARGETS, type WalkTarget } from "../game/scene/walkPath";
import { PowerMeter } from "../game/scene/PowerMeter";
import { prefersReducedMotion } from "../game/scene/reducedMotion";
import { useFishingGame } from "../game/useFishingGame";
import { useCatchSync } from "../game/useCatchSync";
import { settings as savedSettings, updateSettings, useSettings } from "../game/settings";
import { oneDecimal, rarityLabel } from "../game/logic";
import { locale, t, tn, useT } from "../i18n";
import { saveShareCard, shareCardFileName } from "../game/shareCard";
import { bestBeatText } from "../i18n/content";

/** How often the page reads the clock for a new lake hour. */
const HOUR_CHECK_MS = 30_000;
/** The veil darkens, the hour swaps under it, then it lifts. */
const HOUR_SWAP_MS = 1_100;
const HOUR_VEIL_MS = 3_200;

function hourTurnLine(hour: LakeHour): string {
  switch (hour) {
    case "dawn":
      return t("Dawn breaks over the lake.");
    case "day":
      return t("The sun is up.");
    case "dusk":
      return t("Dusk settles on the water.");
    case "night":
      return t("Night falls.");
  }
}

const SIGNPOSTS: readonly { target: WalkTarget; label: string }[] = [
  { target: "dock", label: STANCE_LABELS.dock },
  { target: "point", label: STANCE_LABELS.point },
  { target: "reeds", label: STANCE_LABELS.reeds },
  { target: "inlet", label: STANCE_LABELS.inlet },
  { target: "dropoff", label: STANCE_LABELS.dropoff },
  { target: "shop", label: "Shack" },
];

/** How long the "effects set to Lite" notice stays up. */
const EFFECTS_NOTICE_MS = 5000;

export function DockPage() {
  useT();
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
  // Read once per visit like the day's weather; ?season= pins it for testing.
  const season = seasonFromSearch(params.toString()) ?? lakeSeason(openedAt);
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
  const steppedDownAt = useEffectsSteppedDown();
  const [effectsNotice, setEffectsNotice] = useState(false);
  useEffect(() => {
    if (!steppedDownAt) return;
    setEffectsNotice(true);
    const timer = window.setTimeout(() => setEffectsNotice(false), EFFECTS_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [steppedDownAt]);
  const chosenLure = pickedLure ?? defaultLure(lureChoices, me?.profile.strength ?? 1);
  const tiedLure = useRef(chosenLure);
  const caughtTotal = me?.speciesStats.reduce((sum, stat) => sum + stat.caught, 0) ?? 0;
  const mercy = isMercy(caughtTotal);
  const game = useFishingGame(me?.profile ?? null, hour, tiedLure, sky, mercy, season);
  const scenePhase = game.outcome ? "result" : game.phase;
  const boatState = useSyncExternalStore(subscribeBoat, boatMode);
  // One fish from the rise under the bobber through the fight to the hand, or the turn-away on a miss.
  const shownFish =
    game.outcome?.kind === "landed" ? game.outcome : game.outcome?.kind === "miss" ? (game.outcome.fish ?? null) : (game.fight ?? game.bite);
  // A controller replays as keys and pointer moves; its cursor is drawn over the scene.
  const { cursor: padCursor, connected: padConnected } = useGamepad();
  // The landed fish's ID is its request ID, so this matches the roll the server makes.
  const landedGolden = game.outcome?.kind === "landed" && isGolden(game.outcome.id);
  if (lureCanChange(scenePhase)) tiedLure.current = chosenLure;
  const lure = tiedLure.current;
  const lureLocked = !lureCanChange(scenePhase);
  const posted = useRef<string | null>(null);
  // The local day the fish landed on, kept so a later retry files it under the same day.
  const landedDay = useRef(localDate(new Date()));
  const userId = me?.profile.userId;
  const catchSync = useCatchSync(userId, setMe);
  const [fieldSaved, setFieldSaved] = useState(false);
  const [fieldLogError, setFieldLogError] = useState("");
  const [photoSaved, setPhotoSaved] = useState(false);
  // The scene's snapshot of the fish held up, and the catch it belongs to.
  const catchShot = useSyncExternalStore(subscribeCatchShot, latestCatchShot);
  const shotFor = useRef<{ seq: number; id: string; dataUrl: string } | null>(null);
  const shotBase = useRef<{ id: string; seq: number } | null>(null);
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
  // The day on the water, kept per angler so a closed tab can be written up next visit.
  const [session, setSession] = useState<SessionDraft | null>(null);
  const [recap, setRecap] = useState<{ leftover: boolean } | null>(null);
  const [filedTrip, setFiledTrip] = useState<{ id: string; title: string } | null>(null);
  const sessionOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    const stored = loadSession(userId);
    sessionOwner.current = userId;
    if (stored && stored.fish.length > 0 && stored.date !== localDate(new Date())) {
      setSession(stored);
      setRecap({ leftover: true });
      return;
    }
    // A fish landed before the profile arrived joins today's stored outing rather than replacing it.
    setSession((current) => (stored && current ? current.fish.reduce(withSessionFish, stored) : (current ?? stored)));
  }, [userId]);
  useEffect(() => {
    if (userId && sessionOwner.current === userId) saveSession(userId, session);
  }, [session, userId]);
  useEffect(() => {
    if (game.outcome?.kind !== "landed") return;
    const { id, species, weight, spot: landedAt, clean } = game.outcome;
    const first = stamp?.kind === "first";
    setSession((current) => {
      const now = new Date();
      const base = current && current.date === localDate(now) ? current : startSession(now, sky);
      return withSessionFish(base, { id, speciesId: species.id, speciesName: species.name, weight, spot: landedAt, hour, first, clean });
    });
    // Only a new landing adds a fish; hour and sky changes must not replay it.
  }, [game.outcome]);
  const fileTrip = () => {
    if (!session) return;
    const title = sessionTitle(session);
    try {
      const book = readStoredLogbook() ?? sampleLogbook(new Date());
      saveLogbook(keepPlayTrip(book, { id: session.id, date: session.date, title, catchIds: session.fish.map((fish) => fish.id), note: t("Season: {season}", { season: t(SEASON_LABELS[season]) }) }));
      setFiledTrip({ id: session.id, title });
      setSession(null);
    } catch {
      setFieldLogError(t("The field log could not be saved in this browser."));
    }
  };
  const closeRecap = () => {
    // Letting an old trip go clears it; closing today's keeps fishing on the same outing.
    if (recap?.leftover && !filedTrip) setSession(null);
    setRecap(null);
    setFiledTrip(null);
  };

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
      void saveOutcome(outcome.id, { requestId: outcome.id, speciesId: outcome.species.id, weight: outcome.weight, spot: outcome.spot, clean: outcome.clean, hour, sky, season, day: landedDay.current });
      return;
    }
    void catchSync.sync();
  };

  useEffect(() => {
    refresh().catch((err: Error) => setError(errorText(err.message)));
  }, [refresh]);

  useEffect(() => () => fx.ambient.stop(), []);

  useEffect(() => fx.ambient.setConditions(hour, sky, season), [hour, sky, season]);

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

  const pinPhoto = useCallback((id: string) => {
    const shot = shotFor.current;
    if (shot?.id !== id) return;
    try {
      if (saveLandedPhoto(id, shot.dataUrl)) setPhotoSaved(true);
    } catch {
      // The catch is kept; only the photo didn't fit in this browser.
    }
  }, []);

  // The snapshot comes as the fish is held up, after the catch was written.
  useEffect(() => {
    if (game.outcome?.kind !== "landed") return;
    // Only a shot taken after this fish landed; an earlier landing's late shot must not be pinned to it.
    if (shotBase.current?.id !== game.outcome.id) shotBase.current = { id: game.outcome.id, seq: catchShot?.seq ?? 0 };
    if (!catchShot || catchShot.seq <= shotBase.current.seq) return;
    if (shotFor.current?.seq === catchShot.seq) return;
    shotFor.current = { seq: catchShot.seq, id: game.outcome.id, dataUrl: catchShot.dataUrl };
    pinPhoto(game.outcome.id);
  }, [catchShot, game.outcome, pinPhoto]);

  const [shareError, setShareError] = useState(false);
  // The landed fish let go from the card, by its catch ID; a new landing starts kept.
  const [releasedId, setReleasedId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState(false);
  const landedReleased = game.outcome?.kind === "landed" && releasedId === game.outcome.id;
  const releaseFish = async () => {
    const outcome = game.outcome;
    if (outcome?.kind !== "landed" || releasing) return;
    setReleasing(true);
    setReleaseError(false);
    try {
      // A catch still in the queue goes up first, so the server has it to let go.
      await catchSync.sync();
      await releaseCatch(outcome.id);
      setReleasedId(outcome.id);
      refresh().catch(() => undefined);
    } catch {
      setReleaseError(true);
    } finally {
      setReleasing(false);
    }
  };
  useEffect(() => setShareError(false), [game.outcome]);
  const savePicture = () => {
    const outcome = game.outcome;
    if (outcome?.kind !== "landed") return;
    const now = new Date();
    const photo = shotFor.current?.id === outcome.id ? shotFor.current.dataUrl : null;
    const text = {
      title: t(outcome.species.name),
      detail: `${oneDecimal(outcome.weight)} lb · ${t(SPOT_LABELS[outcome.spot])}`,
      conditions: [t(LAKE_HOUR_LABELS[hour]), t(SKY_LABELS[sky]), t(SEASON_LABELS[season])].join(" · "),
      date: now.toLocaleDateString(locale(), { year: "numeric", month: "long", day: "numeric" }),
    };
    saveShareCard(text, photo, shareCardFileName(outcome.species.id, now)).catch(() => setShareError(true));
  };

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
      setFieldLogError(err instanceof Error ? errorText(err.message) : t("The field log could not be saved."));
    }
    pinPhoto(id);
  }, [game.outcome, openedAt, sky, pinPhoto]);

  useEffect(() => {
    if (game.outcome?.kind !== "landed") {
      posted.current = null;
      setFieldSaved(false);
      setFieldLogError("");
      setPhotoSaved(false);
      setReleaseError(false);
      return;
    }
    const { id, species, weight, spot: catchSpot, clean } = game.outcome;
    if (posted.current === id) return;
    landedDay.current = localDate(new Date());
    saveFieldLog();
    if (!userId) return;
    void saveOutcome(id, { requestId: id, speciesId: species.id, weight, spot: catchSpot, clean, hour, sky, season, day: landedDay.current });
  }, [game.outcome, saveFieldLog, saveOutcome, userId, hour, sky, season]);

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
      setError(err instanceof Error ? errorText(err.message) : t("upgrade failed"));
    } finally {
      setBusy(false);
    }
  };

  if (!me) {
    return <div className="dock-page">{error || t("Walking the planks…")}</div>;
  }

  const dropoffOpen = canUseSpot("dropoff", me.level);
  const fishing = isFishingStance(game.stance);
  const bank = isFishingStance(game.stance) ? game.stance : game.spot;
  const inletOpen = canUseSpot("inlet", me.level);
  const boatOpen = canUseSpot("open", me.level);
  const rowing = boatState === "rowingOut" || boatState === "rowingBack";
  const stanceLabel = rowing
    ? t("Rowing")
    : game.stance === "dropoff" && !dropoffOpen
      ? t("{spot} (lv {level})", { spot: t(STANCE_LABELS.dropoff), level: DROPOFF_LEVEL })
      : game.stance === "inlet" && !inletOpen
        ? t("{spot} (lv {level})", { spot: t(STANCE_LABELS.inlet), level: INLET_LEVEL })
        : t(STANCE_LABELS[game.stance]);

  return (
    <div className="dock-page">
      <Hud
        profile={me.profile}
        hour={hour}
        sky={sky}
        season={season}
        onSettings={() => setSettingsOpen(true)}
        streak={streakDays(me.recentDays, localDate(new Date())).current}
        onPackUp={session && session.fish.length > 0 && bankClear ? () => setRecap({ leftover: false }) : undefined}
      />
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
        data-season={season}
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
          season={season}
          species={shownFish?.species ?? null}
          weight={shownFish?.weight ?? 0}
          golden={landedGolden}
          released={landedReleased}
          hotspot={game.hotspot}
          tracks={tracks}
          powerRef={game.powerRef}
          accuracy={me.profile.accuracy}
        />
        {padCursor && <i className="pad-cursor" aria-hidden style={{ left: padCursor.x, top: padCursor.y }} />}
        {game.phase === "hookset" && (
          <div className="strike-cue" role="alert" style={{ "--strike-ms": `${hookWindowMs(me.profile.accuracy, mercy)}ms` } as CSSProperties}>
            <strong>{t("Strike!")}</strong>
            <span className="cue-keys">{t("Click or Space")}</span>
            <span className="cue-touch">{t("Tap anywhere")}</span>
            <i />
          </div>
        )}
        {(scenePhase === "waiting" || scenePhase === "hookset" || scenePhase === "fight") && (
          // Space and a tap on the water do the same; this is just where a thumb rests on a phone.
          <button className="thumb-strike" type="button" data-thumb-strike data-phase={scenePhase} tabIndex={-1} aria-hidden>
            {scenePhase === "fight" ? t("Reel") : t("Strike")}
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
                <p>{catchSync.error || tn(catchSync.pendingCount, "{n} catch waiting to sync.", "{n} catches waiting to sync.")}</p>
                <button className="panel-btn" type="button" onClick={retryServerSave}>{t("Retry server save")}</button>
              </>
            )}
            {catchSync.rejectedCount > 0 && (
              <>
                <p>{tn(catchSync.rejectedCount, "{n} catch could not be verified. Your field-log entries are kept.", "{n} catches could not be verified. Your field-log entries are kept.")}</p>
                <button className="panel-btn" type="button" onClick={catchSync.dismissRejected}>{t("Dismiss")}</button>
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
          <nav className="walk-signs" data-camera-control aria-label={t("Walk to")}>
            {game.stance === "shop" && (
              <button className="panel-btn walk-shop" type="button" onClick={() => setShopOpen(true)}>
                {t("Open shop")}
              </button>
            )}
            {boatState === "anchored" && (
              <button className="panel-btn" type="button" onClick={(event) => {
                event.currentTarget.blur();
                rowBack();
              }}>
                {t("Row back")}
              </button>
            )}
            {/* The rowboat is tied to the pier; it unties at the level that opens the deep water. */}
            {boatState === "moored" && boatOpen && game.stance === "dock" && (
              <button className="panel-btn walk-shop" type="button" onClick={(event) => {
                event.currentTarget.blur();
                rowOut();
              }}>
                {t("Row out")}
              </button>
            )}
            {/* The inlet's signpost goes up with the level that opens it; until then the west shore is just a walk. */}
            {!aboard(boatState) && SIGNPOSTS.filter(({ target }) => target !== "inlet" || inletOpen).map(({ target, label }) => (
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
                {t(label)}
              </button>
            ))}
          </nav>
        )}
        {padConnected ? (
          <aside className="camera-help" data-camera-control data-pad>
            <span>{t("Controller")}</span>
            <kbd>{t("Left stick")}</kbd> {t("walk")}
            <kbd>{t("Right stick")}</kbd> {t("aim")}
            <kbd>A</kbd> {t("cast, strike, reel")}
            <kbd>Y</kbd> {t("shop")}
            <kbd>B</kbd> {t("close")}
          </aside>
        ) : (
          <aside className="camera-help" data-camera-control>
            <span>{t("Shore")}</span>
            <kbd>WASD</kbd> {t("or")} <kbd>{t("Click shore")}</kbd> {t("walk")}
            <kbd>{t("Click water")}</kbd> {t("aim")}
            <kbd>E</kbd> {t("shop")}
            <kbd>{t("Right drag")}</kbd> {t("look")}
          </aside>
        )}
        {game.fight && !game.outcome && <FightBar fight={game.fight} sim={game.sim} performance={game.performance} />}
        {game.outcome?.kind === "landed" && (
          <div className={`landed-card rarity-${game.outcome.species.rarity}${landedGolden ? " golden" : ""}`}>
            {fieldBeat && (
              <p className="catch-best" role="status">
                <strong>{t("Personal best")}</strong>
                <span>{bestBeatText(fieldBeat)}</span>
              </p>
            )}
            <FishMark species={game.outcome.species} golden={landedGolden} />
            <span className="rarity-tag">{rarityLabel(game.outcome.species.rarity)}</span>
            <h2>{t(game.outcome.species.name)}</h2>
            <p className="catch-lore">{t(game.outcome.species.lore)}</p>
            <p className="catch-lure">{t(lure)}</p>
            <p>{oneDecimal(game.outcome.weight)} lb · {t(SPOT_LABELS[game.outcome.spot])}</p>
            <p>
              {t("+{points} pts", {
                points: catchPoints(
                  game.outcome.species,
                  game.outcome.weight,
                  game.outcome.clean,
                  weeklyBonus(game.outcome.species.id) * (landedGolden ? GOLDEN_BONUS : 1),
                ),
              })}
            </p>
            {landedGolden && <p className="catch-stamp golden">{t("Golden fish · 2× points")}</p>}
            {weeklyBonus(game.outcome.species.id) > 1 && <p className="catch-stamp">{t("Fish of the week · 1.5× points")}</p>}
            {game.outcome.clean && <p className="catch-stamp">{t("Clean fight")}</p>}
            {stamp?.kind === "first" && <p className="catch-stamp">{t("New in the field guide")}</p>}
            {stamp?.kind === "pb" && (
              <p className="catch-stamp">{t("Personal best · was {weight} lb", { weight: oneDecimal(stamp.previous) })}</p>
            )}
            {stamp?.kind === "repeat" && (
              <p className="catch-stamp quiet">{t("Book PB {weight} lb", { weight: oneDecimal(stamp.heaviest) })}</p>
            )}
            {stamp?.trophy && <p className="catch-stamp">{t("Trophy")}</p>}
            {lodge?.kind === "first" && <p className="catch-stamp">{t("First on the lodge wall")}</p>}
            {lodge?.kind === "record" && (
              <p className="catch-stamp">
                {lodge.yours
                  ? t("Lodge record · beat your {weight} lb", { weight: oneDecimal(lodge.previous) })
                  : t("Lodge record · was {weight} lb ({holder})", { weight: oneDecimal(lodge.previous), holder: lodge.holder })}
              </p>
            )}
            <div className="catch-actions">
              {fieldSaved && (
                <p className="catch-stamp quiet">{photoSaved ? t("Saved in the field log, with a photo") : t("Saved in the field log")}</p>
              )}
              {fieldLogError && (
                <p className="warn" role="alert">
                  {fieldLogError}
                </p>
              )}
              {landedReleased ? (
                <p className="catch-stamp released">{t("Released back into the lake")}</p>
              ) : (
                <button className="panel-btn" type="button" onClick={() => void releaseFish()} disabled={releasing}>
                  {releasing ? t("Releasing…") : t("Release")}
                </button>
              )}
              {releaseError && (
                <p className="warn" role="alert">
                  {t("The fish could not be released right now. It is kept; try again when you're online.")}
                </p>
              )}
              <button className="panel-btn" type="button" onClick={game.dismissResult}>
                {t("Keep fishing")}
              </button>
              {fieldLogError && (
                <button className="panel-btn" type="button" onClick={saveFieldLog}>
                  {t("Try saving again")}
                </button>
              )}
              <Link className="panel-btn" to="/catches">
                {t("Field log")}
              </Link>
              <button className="panel-btn" type="button" onClick={savePicture}>
                {t("Save picture")}
              </button>
              {shareError && (
                <p className="warn" role="alert">
                  {t("The picture could not be made in this browser.")}
                </p>
              )}
            </div>
          </div>
        )}
        {game.outcome && game.outcome.kind !== "landed" && (
          <div className="toast">
            <p>{game.outcome.message}</p>
            <button className="panel-btn" type="button" onClick={game.dismissResult}>
              {t("Cast again")}
            </button>
          </div>
        )}
        {bankClear && tracks.length > 0 && (
          <aside className="lodge-tracks" aria-label={t("Lately on the lake")}>
            <span className="eyebrow">{t("Lately on the lake")}</span>
            {tracks.slice(0, 2).map((track) => (
              <p key={track.id}>{trackLabel(track, Date.now())}</p>
            ))}
          </aside>
        )}
        {veil && (
          <div className="hour-veil" key={veil} role="status">
            <strong>{hourTurnLine(veil)}</strong>
            <span>{t(LAKE_HOUR_BLURB[veil])}</span>
          </div>
        )}
        {/* Mounted empty so screen readers announce the toast when it fills in. */}
        <div className="level-status" role="status">
          {effectsNotice && (
            <div className="toast effects-toast">
              <p>{t("Effects set to Lite to keep the lake smooth. Settings can turn them back.")}</p>
            </div>
          )}
          {shownLevel && (
            <div className="toast level-toast">
              <h2>{t("Level {level}", { level: shownLevel.level })}</h2>
              {shownLevel.opened && <p>{shownLevel.opened}</p>}
            </div>
          )}
          {shownBadges && (
            <div className="toast level-toast badge-toast">
              <span className="eyebrow">{shownBadges.length > 1 ? t("Badges") : t("Badge")}</span>
              <h2>{shownBadges.map((id) => (badgeById(id) ? t(badgeById(id)!.label) : id)).join(" · ")}</h2>
              {shownBadges.length === 1 && <p>{t(badgeById(shownBadges[0])?.blurb ?? "")}</p>}
            </div>
          )}
        </div>
        {shopOpen && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-label={t("The shack")} ref={shopPanel} tabIndex={-1}>
            <UpgradePanel profile={me.profile} busy={busy || scenePhase !== "idle"} onBuy={onBuy} />
            <DailyRequestsPanel key={userId} catchKey={me.catches[0]?.id} onClaimed={refresh} />
            <ForecastBoard />
            <button className="panel-btn" type="button" onClick={() => setShopOpen(false)}>
              {t("Back to the path")}
            </button>
            {error && <p className="warn">{error}</p>}
          </div>
        )}
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {recap && (session || filedTrip) && (
        <TripRecap
          draft={session ?? { id: filedTrip!.id, date: "", sky, fish: [] }}
          leftover={recap.leftover}
          filed={filedTrip}
          onFile={fileTrip}
          onClose={closeRecap}
        />
      )}
    </div>
  );
}
