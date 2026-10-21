import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  canUseSpot,
  hotBankForDay,
  crowdedBankForDay,
  DROPOFF_LEVEL,
  INLET_LEVEL,
  catchPoints,
  cleanRunBonus,
  LODGE_RECORD_BONUS,
  PB_BONUS,
  CLEAN_RUN_FROM,
  catchStamp,
  masteryBonus,
  tierReachedBy,
  dailyConditions,
  fieldLogBestBeat,
  isFishingStance,
  badgeById,
  lodgeStamp,
  type SpeciesRecord,
  type SpotId,
  type BonusId,
  type LodgeRelease,
  TAG_FINDER_BONUS,
  LOST_FINDER_BONUS,
  type LodgeLost,
  type LostFound,
  GIANT_BONUS,
  TAG_RETURN_BONUS,
  fishById,
  LAKE_HOUR_BLURB,
  lakeHour,
  lakeHourFromSearch,
  lakeSeason,
  seasonFromSearch,
  weeklyBonus,
  GOLDEN_BONUS,
  isGolden,
  LAKE_HOUR_LABELS,
  SEASON_LABELS,
  luresPacked,
  keepPlayTrip,
  localDate,
  weekOf,
  streakDays,
  addToBag,
  fishedDown,
  slamCompletedBy,
  bagToBeat,
  bagDay,
  bagTotal,
  dayRunForFirstFish,
  DAY_RUN_BONUS,
  STANCE_LABELS,
  SPOT_LABELS,
  skyAt,
  isSnow,
  dailyWind,
  moonFromSearch,
  moonLight,
  moonName,
  moonPhase,
  showsSolidMark,
  skyBlurb,
  skyLabel,
  weatherFromSearch,
  releaseBonus,
  NEST_RELEASE_BONUS,
  TROPHY_RELEASE_BONUS,
  backToItsNest,
  type CatchSubmission,
  type LakeHour,
  type LakeSeason,
  type Sky,
  type SkillId,
  type StanceId,
} from "@stillwater/shared";
import { buyAerator, buyBreadCrumb, buyGroundbait, buyShiner, buyUpgrade, buyWorm, buyWormBin, errorText, getBankWeek, getGiants, getLodgeLost, reportLost, type GiantStatus, getLodgeReleased, getMe, getSpeciesRecords, getWeeklyChallenges, releaseCatch, type Me, type WeeklyBoard } from "../api";
import { DailyRequestsPanel } from "../components/DailyRequestsPanel";
import { WeeklyChallengesPanel } from "../components/WeeklyChallengesPanel";
import { FightBar } from "../components/FightBar";
import { FishMark } from "../components/FishMark";
import { useGamepad } from "../game/useGamepad";
import { Hud } from "../components/Hud";
import { ForecastBoard } from "../components/ForecastBoard";
import { LureChoice } from "../components/LureChoice";
import { UpgradePanel } from "../components/UpgradePanel";
import { BaitShop } from "../components/BaitShop";
import { SettingsPanel } from "../components/SettingsPanel";
import { SoundCaptions } from "../components/SoundCaptions";
import { KeysCard } from "../components/KeysCard";
import { stormOn } from "../game/scene/storm";
import { WalkStick } from "../components/WalkStick";
import { WhatsNew } from "../components/WhatsNew";
import { eveningRiseOn } from "../game/eveningRise";
import { SHALLOW_BANKS, useCloudOverSun } from "../game/sunCover";
import { useMoonPassing } from "../game/solunar";
import { Walkthrough } from "../components/Walkthrough";
import { bestPounds } from "../game/bestWeight";
import { hookNoteMs } from "../game/hookNote";
import { bookForPlay, markReleasedInBook, saveLandedCatch, saveLandedPhoto } from "../field/keepCatch";
import { LURE_TIER_WORD, lureCatchCount, lureTier, lureTierReachedBy } from "../game/lureSeasoning";
import { rememberReleased, remembersReleased } from "../game/releasedFish";
import { readTackle } from "../field/gear/storage";
import { useEffectsSteppedDown } from "../game/frameWatch";
import { useEffectsNotice } from "../game/effectsNotice";
import { saveLogbook } from "../field/storage";
import { fx } from "../game/fx";
import { canBaitShiner, GROUNDBAIT_CASTS, hookWindowMs, isMercy, lampLit, longShadowWaitMul, solidStrikeMs } from "../game/logic";
import { useBadgeToast } from "../game/useBadgeToast";
import { lostNewsKey, useNewsToast, useTagNewsToast } from "../game/useTagNewsToast";
import { bookSeasonNote, bookSessionTitle, loadSession, saveSession, sessionTitle, startSession, withSessionFish, type SessionDraft } from "../game/session";
import { TripRecap } from "../components/TripRecap";
import { useLodgeTracks } from "../game/useLodgeTracks";
import { trackLabel } from "../game/scene/shoreTracks";
import { useLevelToast } from "../game/useLevelToast";
import { defaultLure, lureCanChange, nextLure } from "../game/lureChoice";
import { FishingWorld } from "../game/scene/FishingWorld";
import { walkAnglerTo } from "../game/scene/pose";
import { aboard, boatMode, rowBack, rowOut, subscribeBoat } from "../game/scene/boat";
import { latestCatchShot, subscribeCatchShot } from "../game/scene/catchPhoto";
import { WALK_TARGETS, type WalkTarget } from "../game/scene/walkPath";
import { bankSuitsNow } from "../game/bankNow";
import { PowerMeter } from "../game/scene/PowerMeter";
import { prefersReducedMotion } from "../game/scene/reducedMotion";
import { shyOf } from "../game/giantShy";
import { nightLineKinds, nightLineState, wormLineHour } from "../game/nightLine";
import { trapIsCold, trapState } from "../game/minnowTrap";
import { foeAbout, isOldFoe, loadOldFoe, saveOldFoe } from "../game/oldFoe";
import { BUCKET_SIZE } from "../game/baitBucket";
import { WORM_TIN_WET } from "../game/wormTin";
import { isLiveBait, isTopwater, touchScreen, useFishingGame, type Outcome } from "../game/useFishingGame";
import { useCatchSync } from "../game/useCatchSync";
import { settings as savedSettings, updateSettings, useSettings } from "../game/settings";
import { rarityLabel } from "../game/logic";
import { locale, t, tn, useT } from "../i18n";
import { nextDrag } from "../game/drag";
import { nextLine, type LineWeight } from "../game/lineWeight";
import { boatSwingShare, canTurnRuns, fightWind } from "../game/fight";
import { fightNotesText } from "../game/fightNotes";
import { savePng, saveShareCard, shareCardFileName } from "../game/shareCard";
import { lakePictureFileName, requestLakeShot } from "../game/scene/lakeShot";
import { lookDrag, lookZoom } from "../game/scene/photoLook";
import { PHOTO_KEY_TURNS, usePhotoDrag } from "../game/usePhotoDrag";
import { bestBeatText, weightText } from "../i18n/content";
import { usePageTitle } from "../pageTitle";
import { useTabWrap } from "../components/tabWrap";

/** How often the page reads the clock for a new lake hour. */
const HOUR_CHECK_MS = 30_000;
/** The veil darkens, the hour or the sky swaps under it, then it lifts. */
const HOUR_SWAP_MS = 1_100;
const HOUR_VEIL_MS = 3_200;

/** A change the lake waits to show until the bank is calm: a new lake hour, or the day's sky turning. */
type Turn = { kind: "hour"; hour: LakeHour } | { kind: "sky"; from: Sky; sky: Sky };

function skyTurnLine(from: Sky, to: Sky, season: LakeSeason): string {
  if (to === "rain") return isSnow(to, season) ? t("Snow starts falling on the lake.") : t("Rain starts falling on the water.");
  if (to === "overcast" && from === "rain") return isSnow(from, season) ? t("The snow stops.") : t("The rain eases off.");
  if (to === "overcast") return t("Clouds roll in over the lake.");
  if (to === "clear" && from === "fog") return t("The fog burns off.");
  return t("The weather turns.");
}

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

/** The walk signs' line button, naming the line on the reel. */
const LINE_WORD: Record<LineWeight, string> = { light: "Line: light", standard: "Line: standard", heavy: "Line: heavy" };
const LINE_SHORT: Record<LineWeight, string> = { light: "Thin", standard: "Line", heavy: "Thick" };

/** A lost trophy's news is told once by its report's id. */
const lostNewsId = (one: LostFound) => one.id;

export function DockPage() {
  useT();
  usePageTitle(`${t("On the lake")} · Stillwater`);
  const [params] = useSearchParams();
  // One clock for the hour and the day's weather, so both turn over together.
  const [openedAt] = useState(() => new Date());
  const forcedHour = lakeHourFromSearch(params.toString());
  // The real clock keeps running while you fish; ?hour= pins it for testing.
  const [liveHour, setLiveHour] = useState(() => lakeHour(openedAt));
  const [turningTo, setTurningTo] = useState<Turn | null>(null);
  const [veil, setVeil] = useState<Turn | null>(null);
  const hour = forcedHour ?? liveHour;
  // The day's sky can turn once while you fish, on the forecast's schedule; ?sky= pins it for testing.
  const forcedSky = weatherFromSearch(params.toString());
  const [liveSky, setLiveSky] = useState(() => skyAt(openedAt));
  const sky = forcedSky ?? liveSky;
  // Read once per visit like the day's weather; ?season= pins it for testing.
  const season = seasonFromSearch(params.toString()) ?? lakeSeason(openedAt);
  // The real moon, read once per visit; ?moon= pins the phase for testing.
  const moon = moonFromSearch(params.toString()) ?? moonPhase(openedAt);
  const hotBank = useMemo(() => hotBankForDay(openedAt), [openedAt]);
  const crowdedBank = useMemo(() => crowdedBankForDay(openedAt), [openedAt]);
  // The field log's wind for the day, as a drift on the sitting float.
  const wind = useMemo(() => dailyWind(openedAt, sky), [openedAt, sky]);
  const rising = eveningRiseOn(hour, season, sky, wind.wind);
  const clouded = useCloudOverSun(sky, hour);
  const moonPass = useMoonPassing();
  const storm = stormOn(sky, season, wind.wind);
  const lureNow = useMemo(() => ({ sky, hour, season, wind: wind.wind, moon: moonLight(moon), rising }), [sky, hour, season, wind.wind, moon, rising]);
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
  const [keysOpen, setKeysOpen] = useState(false);
  const shopPanel = useRef<HTMLDivElement>(null);
  useTabWrap(shopPanel);
  // The lake's news sits just above the hint, however many lines the hint wraps to: its height rides on a CSS variable.
  const hintSize = useRef<ResizeObserver | null>(null);
  const hintRef = useCallback((node: HTMLParagraphElement | null) => {
    hintSize.current?.disconnect();
    hintSize.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => node.parentElement?.style.setProperty("--hint-h", `${node.offsetHeight}px`));
    observer.observe(node);
    hintSize.current = observer;
  }, []);
  const prefs = useSettings();
  const steppedDownAt = useEffectsSteppedDown();
  const chosenLure = pickedLure ?? defaultLure(lureChoices, me?.profile.strength ?? 1);
  const tiedLure = useRef(chosenLure);
  const caughtTotal = me?.speciesStats.reduce((sum, stat) => sum + stat.caught, 0) ?? 0;
  const mercy = isMercy(caughtTotal);
  // The week's legend hunt, read with the weekly challenges; a solved one draws its legend to its bank.
  const [hunt, setHunt] = useState<{ week: string; rumor: WeeklyBoard["rumor"] } | null>(null);
  const latestCatch = me?.catches[0]?.id;
  const angler = me?.profile.userId;
  useEffect(() => {
    if (!angler) return;
    let live = true;
    getWeeklyChallenges()
      .then((board) => live && setHunt({ week: board.week, rumor: board.rumor }))
      // The shack's own panel reports the board's errors; the hunt keeps what it last read until a catch reads it again.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [angler, latestCatch]);
  // A hunt only holds for its own week, even in a tab left open past Sunday midnight.
  const legend = hunt && hunt.week === weekOf(localDate(new Date())) && hunt.rumor.clues.every(Boolean) ? { legendId: hunt.rumor.legendId, spot: hunt.rumor.spot } : null;
  // Other anglers' let-go fish, read once a visit, for a cast to find.
  const [lodgeReleased, setLodgeReleased] = useState<LodgeRelease[]>([]);
  useEffect(() => {
    if (!angler) return;
    let live = true;
    getLodgeReleased()
      .then((rows) => live && setLodgeReleased(rows))
      // Without the list the lake simply holds no tagged fish this visit.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [angler]);
  // Each packed lure's tier from the fish the game landed on it, as the field log keeps them; read again after each save.
  const [bookCatches, setBookCatches] = useState(() => bookForPlay().catches);
  const lureTiers = useMemo(() => new Map(lureChoices.map((choice) => [choice, lureTier(lureCatchCount(bookCatches, choice))])), [lureChoices, bookCatches]);
  const bookCatchesRef = useRef(bookCatches);
  bookCatchesRef.current = bookCatches;
  const luckyLures = useMemo(() => new Set(lureChoices.filter((choice) => lureTiers.get(choice) === "lucky")), [lureChoices, lureTiers]);
  // The fish the angler kept at each bank over the week, read once a visit; this visit's kept fish count on top.
  const [bankWeek, setBankWeek] = useState<Partial<Record<SpotId, number>>>({});
  const [keptHere, setKeptHere] = useState<Partial<Record<SpotId, number>>>({});
  useEffect(() => {
    setBankWeek({});
    setKeptHere({});
    if (!angler) return;
    let live = true;
    getBankWeek()
      .then((counts) => live && setBankWeek(counts))
      // Without the counts no bank reads as fished down this visit.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [angler]);
  const fishedDownBanks = useMemo(
    () => new Set((Object.keys({ ...bankWeek, ...keptHere }) as SpotId[]).filter((bank) => fishedDown((bankWeek[bank] ?? 0) + (keptHere[bank] ?? 0)))),
    [bankWeek, keptHere],
  );
  // The week's giants, read when the visit opens, again after each saved catch, so one landed by anyone leaves the lake,
  // and after the angler lets one go, so it shows out again.
  const [giantLetGo, setGiantLetGo] = useState(0);
  const [giants, setGiants] = useState<GiantStatus[]>([]);
  useEffect(() => {
    if (!angler) return;
    let live = true;
    getGiants()
      .then((rows) => live && setGiants(rows))
      // Without the list no giant comes up this visit.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [angler, latestCatch, giantLetGo]);
  const openGiants = useMemo(() => giants.filter((giant) => !giant.landedBy && !giant.letGoByYou), [giants]);
  // Other anglers' lost trophies, read like the giants; one of the angler's own that someone landed is no foe of theirs any more.
  const [lodgeLost, setLodgeLost] = useState<LodgeLost[]>([]);
  const [lostFound, setLostFound] = useState<LostFound[]>([]);
  useEffect(() => {
    if (!angler) return;
    let live = true;
    getLodgeLost()
      .then(({ lost, mineFound }) => {
        if (!live) return;
        setLodgeLost(lost);
        setLostFound(mineFound);
        const foe = loadOldFoe(angler);
        if (foe && mineFound.some((found) => found.spot === foe.spot && isOldFoe(foe, { species: { id: found.speciesId }, weight: found.weight }))) saveOldFoe(angler, null);
      })
      // Without the list no other angler's lost trophy comes up this visit.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [angler, latestCatch]);
  const giantBanks = useMemo(() => openGiants.map((giant) => giant.spot), [openGiants]);
  const game = useFishingGame(me?.profile ?? null, hour, tiedLure, sky, mercy, season, moonLight(moon), rising, wind.wind, wind, legend, lodgeReleased, luckyLures, fishedDownBanks, openGiants, lodgeLost);
  // The angler's own old foe, read again whenever a cast ends, as a loss or a landing changes it.
  const oldFoe = useMemo(() => (angler ? loadOldFoe(angler) : null), [angler, game.outcome]);
  // Each bank a lost trophy is still about, as the stance chip says, has the snapped float it trails drifting on its water.
  const foeBank = oldFoe && foeAbout(oldFoe, oldFoe.spot, Date.now()) ? oldFoe.spot : null;
  const lostFloatBanks = useMemo(() => {
    const banks = new Set(lodgeLost.map((lost) => lost.spot));
    if (foeBank) banks.add(foeBank);
    return [...banks];
  }, [foeBank, lodgeLost]);
  // A trophy that broke the line is filed with the lodge once, for other anglers to meet at its bank.
  const reportedLost = useRef<string | null>(null);
  useEffect(() => {
    const lost = game.lostReport;
    if (!lost || reportedLost.current === lost.id) return;
    reportedLost.current = lost.id;
    // A report that fails only means the rest of the lodge never meets this one; the foe then holds no id the lodge never filed.
    reportLost(lost).catch(() => {
      const foe = angler ? loadOldFoe(angler) : null;
      if (angler && foe?.reportId === lost.id) {
        const { reportId: _unfiled, ...kept } = foe;
        saveOldFoe(angler, kept);
      }
    });
  }, [game.lostReport]);
  useEffect(() => {
    if (game.outcome?.kind !== "landed") return;
    const bank = game.outcome.spot;
    setKeptHere((counts) => ({ ...counts, [bank]: (counts[bank] ?? 0) + 1 }));
  }, [game.outcome]);
  // The cast's left-out reasons, opened from its hint; each cast's list starts closed.
  const [reasonsOpenFor, setReasonsOpenFor] = useState<readonly string[] | null>(null);
  const reasonsOpen = reasonsOpenFor === game.moreReasons;
  const scenePhase = game.outcome ? "result" : game.phase;
  // The hint is hidden in a fight, so the fight card holds the hookset's message (or a mid-fight call) for a while instead.
  const [hookNote, setHookNote] = useState<string | null>(null);
  useEffect(() => {
    if (scenePhase !== "fight" || !game.hint) {
      setHookNote(null);
      return;
    }
    setHookNote(game.hint);
    const timer = window.setTimeout(() => setHookNote(null), hookNoteMs(game.hint));
    return () => window.clearTimeout(timer);
  }, [game.hint, scenePhase]);
  const boatState = useSyncExternalStore(subscribeBoat, boatMode);
  // One fish from the rise under the bobber through the fight to the hand, or the turn-away on a miss.
  const shownFish =
    game.outcome?.kind === "landed" ? game.outcome : game.outcome?.kind === "miss" ? (game.outcome.fish ?? null) : (game.fight ?? game.bite);
  // A controller replays as keys and pointer moves; its cursor is drawn over the scene.
  // Photo mode hides every panel for a clean shot; a bite brings them straight back.
  const [photo, setPhoto] = useState(false);
  // The arrow keys aim too, except in a fight, where Left and Right steer.
  const { cursor: padCursor, connected: padConnected } = useGamepad(true, photo, scenePhase !== "fight");
  // The fight card swaps its key and screen words for the controller's while one is connected.
  useEffect(() => {
    const root = document.documentElement;
    if (padConnected) root.dataset.input = "pad";
    else delete root.dataset.input;
    return () => {
      delete root.dataset.input;
    };
  }, [padConnected]);
  // On a short screen the coach and the news card sit beside the shore signs, which take a second column with larger
  // text: the scene keeps the signs' reach from its right edge, so the cards stop short of them. The lake mounts only once
  // the profile is in, so that is a dependency too. Where the signs leave the bank chip under 64 px, the scene says so.
  const lakeShown = me !== null;
  useEffect(() => {
    const wrap = game.surfaceRef.current;
    const signs = wrap?.querySelector<HTMLElement>(":scope > .walk-signs");
    if (!wrap || !signs) {
      wrap?.style.removeProperty("--signs-room");
      wrap?.removeAttribute("data-chip-cramped");
      return;
    }
    const chip = wrap.querySelector<HTMLElement>(":scope > .stance-chip");
    const sync = () => {
      const signsLeft = signs.getBoundingClientRect().left;
      wrap.style.setProperty("--signs-room", `${Math.ceil(wrap.getBoundingClientRect().right - signsLeft)}px`);
      wrap.toggleAttribute("data-chip-cramped", !!chip && signsLeft - chip.getBoundingClientRect().left - 8 < 64);
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(signs);
    observer.observe(wrap);
    // The chip is hidden while the coach shows, and measures again when the coach goes.
    if (chip) observer.observe(chip);
    return () => observer.disconnect();
  }, [game.surfaceRef, scenePhase, shopOpen, photo, lakeShown]);
  // On an upright phone the hint hangs under the bank chip, which wraps tall in its narrow column when it
  // says several things ("Dock · biting today · bites sooner now · groundbait · 5 left"): the scene keeps its height.
  // On a touch phone it rises to clear the walking stick, never over the chip or the lure panel beside it.
  useEffect(() => {
    const wrap = game.surfaceRef.current;
    const chip = wrap?.querySelector<HTMLElement>(":scope > .stance-chip");
    const lurePanel = wrap?.querySelector<HTMLElement>(":scope > .lure-choice");
    if (!wrap || !chip || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      wrap.style.setProperty("--stance-h", `${Math.ceil(chip.offsetHeight)}px`);
      if (lurePanel) wrap.style.setProperty("--lure-h", `${lurePanel.offsetHeight}px`);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(chip);
    if (lurePanel) observer.observe(lurePanel);
    sync();
    return () => {
      observer.disconnect();
      wrap.style.removeProperty("--stance-h");
      wrap.style.removeProperty("--lure-h");
    };
  }, [game.surfaceRef, lakeShown]);
  // The landed fish's ID is its request ID, so this matches the roll the server makes.
  const landedGolden = game.outcome?.kind === "landed" && isGolden(game.outcome.id);
  if (lureCanChange(scenePhase)) tiedLure.current = chosenLure;
  const lure = tiedLure.current;
  // A worm soaked through many casts, still tied on: the stance chip says so and the Retie button puts a fresh one on.
  const washedWorm = game.washed && isLiveBait(lure);
  const lureLocked = !lureCanChange(scenePhase);
  // Read by the Q and R keys, whose listener is set up once.
  const scenePhaseRef = useRef(scenePhase);
  scenePhaseRef.current = scenePhase;
  const lureChoicesRef = useRef(lureChoices);
  lureChoicesRef.current = lureChoices;
  const shopOpenRef = useRef(shopOpen);
  shopOpenRef.current = shopOpen;
  // Read by the G key: tosses the groundbait whenever its button by the walk signs would.
  const groundbaitKey = useRef(() => {});
  // Read by the T key: reties a frayed or twisted line, or touches up a dull hook, whenever its button by the walk signs shows.
  const retieKey = useRef(() => {});
  const lampKey = useRef(() => {});
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
  /** The landed fish as the server saved it, once the profile has been read again after the save. */
  const landedId = game.outcome?.kind === "landed" ? game.outcome.id : null;
  const savedLanded = landedId ? me?.catches.find((saved) => saved.requestId === landedId) : undefined;
  /** Whether a bonus was paid: as the server saved it once it has, till then the card's own reckoning. */
  const paid = (bonus: BonusId, guess: boolean) => (savedLanded?.bonuses ? savedLanded.bonuses.includes(bonus) : guess);
  /** The tier the tied lure climbs to with this landed fish, read from the book before the fish goes in. */
  const lureReached = useMemo(() => (game.outcome?.kind === "landed" ? lureTierReachedBy(lureCatchCount(bookCatchesRef.current, tiedLure.current)) : null), [game.outcome]);
  const fieldBeat = useMemo(() => {
    if (game.outcome?.kind !== "landed") return null;
    const book = bookForPlay();
    return fieldLogBestBeat(book, game.outcome.species.name, game.outcome.weight, game.outcome.id);
  }, [game.outcome]);
  const statsRef = useRef(me?.speciesStats ?? []);
  statsRef.current = me?.speciesStats ?? [];
  const stamp = useMemo(() => {
    if (game.outcome?.kind !== "landed") return null;
    return catchStamp(statsRef.current, game.outcome.species.id, game.outcome.weight);
  }, [game.outcome]);
  /** How many of the landed kind the angler had before this one, for the mastery tiers. */
  const priorCaught = useMemo(() => {
    const outcome = game.outcome;
    return outcome?.kind === "landed" ? (statsRef.current.find((row) => row.speciesId === outcome.species.id)?.caught ?? 0) : 0;
  }, [game.outcome]);
  const tierReached = tierReachedBy(priorCaught);
  const daysRef = useRef(me?.recentDays ?? []);
  daysRef.current = me?.recentDays ?? [];
  /** The run of days this landed fish keeps going as the day's first, from DAY_RUN_FROM; 0 when it pays no day-run bonus. */
  const dayRun = useMemo(() => (game.outcome?.kind === "landed" ? dayRunForFirstFish(daysRef.current, localDate(new Date())) : 0), [game.outcome]);
  const bagRef = useRef(me?.todayBag);
  bagRef.current = me?.todayBag;
  /** Today's bag with this landed fish in it, read before the catch is saved; a bag read before UTC midnight is yesterday's. */
  const dayBag = useMemo(() => {
    if (game.outcome?.kind !== "landed" || !userId) return null;
    const read = bagRef.current;
    return addToBag(read && read.day === bagDay().from ? read.weights : [], game.outcome.weight);
  }, [game.outcome, userId]);
  // Read before the catch is saved, so a new record can name the one it beat; read again after each save.
  const [records, setRecords] = useState<SpeciesRecord[] | null>(null);
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const lastCatch = me?.catches[0]?.id;
  // Read once per hooked fish, so the fight card can say when it beats the field log's best.
  const fightBest = useMemo(() => (game.fight ? bestPounds(bookForPlay(), game.fight.species.name) : null), [game.fight]);
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
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const recentSlamsRef = useRef(me?.recentSlams ?? []);
  recentSlamsRef.current = me?.recentSlams ?? [];
  /** The slam this landed fish completes with today's earlier fish, saved or still in this outing, read before it joins them. */
  const slam = useMemo(() => {
    if (game.outcome?.kind !== "landed") return null;
    const day = localDate(new Date());
    const saved = recentSlamsRef.current.filter((row) => row.day === day).map((row) => row.speciesId);
    const outing = sessionRef.current?.date === day ? sessionRef.current.fish.map((fish) => fish.speciesId) : [];
    return slamCompletedBy([...saved, ...outing], game.outcome.species.id);
  }, [game.outcome]);
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
      return withSessionFish(base, { id, speciesId: species.id, speciesName: species.name, weight, spot: landedAt, hour: game.outcome?.kind === "landed" ? (game.outcome.hour ?? hour) : hour, first, clean });
    });
    // Only a new landing adds a fish; hour and sky changes must not replay it.
  }, [game.outcome]);
  const fileTrip = () => {
    if (!session) return;
    const title = sessionTitle(session);
    try {
      const book = bookForPlay();
      // The book keeps the outing's own lines in English, so they follow the reader's language when shown.
      saveLogbook(keepPlayTrip(book, { id: session.id, date: session.date, title: bookSessionTitle(session), catchIds: session.fish.map((fish) => fish.id), note: bookSeasonNote(season) }));
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
  /** This catch took the lodge record from another angler, which pays more than a personal best. */
  const lodgeTaken = lodge?.kind === "record" && !lodge.yours;

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
      void saveOutcome(outcome.id, { requestId: outcome.id, speciesId: outcome.species.id, weight: outcome.weight, spot: outcome.spot, clean: outcome.clean, cleanRun: outcome.notes?.cleanRun, hour: outcome.hour ?? hour, sky, season, day: landedDay.current, taggedFrom: outcome.tag?.id, giant: outcome.giant ? true : undefined, lostFrom: outcome.lostFrom?.id ?? outcome.closesLost });
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
    fx.natureVolume = prefs.natureVolume;
    fx.hapticsEnabled = prefs.vibration;
  }, [prefs.muted, prefs.volume, prefs.natureVolume, prefs.vibration]);

  // The lake goes quiet in another tab or app unless the player keeps it playing there.
  useEffect(() => {
    const follow = () => {
      fx.away = !prefs.backgroundSound && document.visibilityState === "hidden";
    };
    follow();
    document.addEventListener("visibilitychange", follow);
    return () => {
      document.removeEventListener("visibilitychange", follow);
      fx.away = false;
    };
  }, [prefs.backgroundSound]);

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
  const photoAllowed = !shopOpen && scenePhase !== "hookset" && scenePhase !== "fight";
  useEffect(() => {
    if (!photoAllowed) setPhoto(false);
  }, [photoAllowed]);
  // The shutter: the scene copies its next frame and the browser saves it as a PNG. The panels stay hidden.
  const [pictureNote, setPictureNote] = useState<{ seq: number; saved: boolean } | null>(null);
  const saveLakePicture = useCallback(() => {
    void requestLakeShot()
      .then((canvas) => {
        if (!canvas) throw new Error("frame");
        return savePng(canvas, lakePictureFileName(new Date()));
      })
      .then(
        (how) => {
          // The share sheet is its own answer; a closed sheet needs none.
          if (how === "downloaded") setPictureNote((note) => ({ seq: (note?.seq ?? 0) + 1, saved: true }));
        },
        () => setPictureNote((note) => ({ seq: (note?.seq ?? 0) + 1, saved: false })),
      );
  }, []);
  const photoDrag = usePhotoDrag();
  useEffect(() => {
    if (!photo) setPictureNote(null);
  }, [photo]);
  useEffect(() => {
    // Capture runs ahead of the game's own keys, so nothing casts or walks off unseen while the panels are away.
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (photo) {
        event.stopImmediatePropagation();
        event.preventDefault();
        if ((event.code === "KeyH" || event.code === "Escape") && !event.repeat) setPhoto(false);
        if ((event.code === "Space" || event.code === "KeyP" || event.code === "Enter") && !event.repeat) saveLakePicture();
        const turn = PHOTO_KEY_TURNS[event.code];
        if (turn) lookDrag(turn[0], turn[1]);
        if (event.code === "Equal" || event.code === "NumpadAdd") lookZoom(0.9);
        if (event.code === "Minus" || event.code === "NumpadSubtract") lookZoom(1 / 0.9);
        return;
      }
      if (event.code !== "KeyH" || event.repeat || !photoAllowed || settingsOpen || keysOpen) return;
      event.preventDefault();
      setPhoto(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [photo, photoAllowed, settingsOpen, keysOpen, saveLakePicture]);
  const bankClear = !shopOpen && (scenePhase === "idle" || scenePhase === "casting" || scenePhase === "waiting");
  const shownLevel = useLevelToast(me?.level, bankClear);
  // A level-up has the floor first; the badge waits its turn behind it.
  const shownBadges = useBadgeToast(me?.badges, bankClear && !shownLevel);
  const shownTag = useTagNewsToast(me?.tagReturns, bankClear && !shownLevel && !shownBadges);
  // Told once, as a tag's return is, when another angler landed a trophy that broke this angler's line.
  const shownLost = useNewsToast(lostFound, bankClear && !shownLevel && !shownBadges && !shownTag, lostNewsId, lostNewsKey(userId ?? ""));
  // The effects notice waits its turn too, behind both: in a fight it covered the tension bar and the let-go cue.
  const effectsNotice = useEffectsNotice(steppedDownAt, !bankClear || !!shownLevel || !!shownBadges || !!shownTag || !!shownLost, EFFECTS_NOTICE_MS);

  // Watch the clock; a new lake hour or sky waits for a calm moment so it never lands mid-strike or mid-fight.
  // One change at a time: the hour goes first and the sky follows on a later check.
  useEffect(() => {
    if (forcedHour && forcedSky) return;
    const check = () => {
      const now = new Date();
      const nextHour = lakeHour(now);
      const nextSky = skyAt(now);
      if (!forcedHour && nextHour !== liveHour) setTurningTo({ kind: "hour", hour: nextHour });
      else if (!forcedSky && nextSky !== liveSky) setTurningTo({ kind: "sky", from: liveSky, sky: nextSky });
      else setTurningTo(null);
    };
    const timer = window.setInterval(check, HOUR_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [forcedHour, forcedSky, liveHour, liveSky]);

  const calmForTurn = scenePhase === "idle" || scenePhase === "waiting" || scenePhase === "result";
  const tracks = useLodgeTracks(Boolean(userId), calmForTurn);
  useEffect(() => {
    if (!turningTo || !calmForTurn) return;
    setVeil(turningTo);
    // The swap lands under the darkest moment of the veil; with reduced motion there is no veil to wait for.
    const swap = window.setTimeout(
      () => {
        if (turningTo.kind === "hour") setLiveHour(turningTo.hour);
        else setLiveSky(turningTo.sky);
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
  const [paidReleaseBonus, setPaidReleaseBonus] = useState(0);
  const landedReleased = game.outcome?.kind === "landed" && releasedId === game.outcome.id;
  // Only the first angler paid for a giant sends it back out by letting it go.
  const firstGiant = (outcome: Outcome) => outcome.kind === "landed" && !!outcome.giant && (outcome.giantBonus ?? GIANT_BONUS) === GIANT_BONUS && paid("giant", true);
  // What letting the landed fish go would pay, and whether it goes back to its nest.
  const releaseOffer =
    game.outcome?.kind === "landed"
      ? { bonus: releaseBonus(game.outcome.species, game.outcome.weight, game.outcome.spot, season), nest: backToItsNest(game.outcome.species, game.outcome.weight, game.outcome.spot, season) }
      : { bonus: 0, nest: false };
  // Release gives way to "Released back into the lake": the note takes focus so a screen reader reads it and the keyboard
  // stays on the card. Space still casts again from it.
  const releasedNote = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!landedReleased) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    releasedNote.current?.focus({ preventScroll: true });
  }, [landedReleased]);
  const releaseFish = async () => {
    const outcome = game.outcome;
    if (outcome?.kind !== "landed" || releasing) return;
    setReleasing(true);
    setReleaseError(false);
    try {
      // A catch still in the queue goes up first, so the server has it to let go.
      await catchSync.sync();
      const { bonus } = await releaseCatch(outcome.id);
      setPaidReleaseBonus(bonus);
      setReleasedId(outcome.id);
      if (firstGiant(outcome)) setGiantLetGo((count) => count + 1);
      // The lake remembers the fish, so it may bite again at this bank another day, a little heavier.
      rememberReleased(outcome.species, outcome.weight, outcome.spot, Date.now(), outcome.lure);
      // Let go, it went back to its bank, so the bank's week no longer counts it.
      setKeptHere((counts) => ({ ...counts, [outcome.spot]: Math.max(0, (counts[outcome.spot] ?? 0) - 1) }));
      try {
        markReleasedInBook(outcome.id);
      } catch {
        // The lake has let it go; the book's mark is a nicety a full store can skip.
      }
      refresh().catch(() => undefined);
    } catch {
      setReleaseError(true);
    } finally {
      setReleasing(false);
    }
  };
  useEffect(() => setShareError(false), [game.outcome]);
  // A landed fish was silent to a screen reader and left focus nowhere: the catch card's heading takes focus when the
  // card comes up, so the fish's name is read and Tab goes on to Release and Keep fishing. Focus a player put on a
  // button or panel stays there. A heading isn't a button, so Space still casts again from it.
  const landedHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (game.outcome?.kind !== "landed") return;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    landedHeading.current?.focus({ preventScroll: true });
  }, [game.outcome]);
  const savePicture = () => {
    const outcome = game.outcome;
    if (outcome?.kind !== "landed") return;
    const now = new Date();
    const photo = shotFor.current?.id === outcome.id ? shotFor.current.dataUrl : null;
    const text = {
      title: t(outcome.species.name),
      detail: `${weightText(outcome.weight)} · ${t(SPOT_LABELS[outcome.spot])}`,
      conditions: [t(LAKE_HOUR_LABELS[hour]), t(skyLabel(sky, season)), t(SEASON_LABELS[season])].join(" · "),
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
      setBookCatches(bookForPlay().catches);
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
    const { id, species, weight, spot: catchSpot, clean, notes, tag, giant, hour: caughtAt, lostFrom, closesLost } = game.outcome;
    if (posted.current === id) return;
    landedDay.current = localDate(new Date());
    saveFieldLog();
    if (!userId) return;
    void saveOutcome(id, { requestId: id, speciesId: species.id, weight, spot: catchSpot, clean, cleanRun: notes?.cleanRun, hour: caughtAt ?? hour, sky, season, day: landedDay.current, taggedFrom: tag?.id, giant: giant ? true : undefined, lostFrom: lostFrom?.id ?? closesLost });
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
      // Escape closes a panel even from its sliders and checkboxes, where the settings panel puts focus.
      if (event.code === "Escape") {
        setShopOpen(false);
        setSettingsOpen(false);
        setKeysOpen(false);
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (event.key === "?") {
        event.preventDefault();
        setSettingsOpen(false);
        setKeysOpen((open) => !open);
        return;
      }
      if ((event.code === "KeyQ" || event.code === "KeyR") && !event.repeat) {
        if (!lureCanChange(scenePhaseRef.current) || shopOpenRef.current || lureChoicesRef.current.length < 2) return;
        event.preventDefault();
        const next = nextLure(lureChoicesRef.current, tiedLure.current, event.code === "KeyR" ? 1 : -1);
        setPickedLure(next);
        updateSettings({ lastLure: next });
        return;
      }
      if (event.code === "KeyG" && !event.repeat) {
        event.preventDefault();
        groundbaitKey.current();
        return;
      }
      if (event.code === "KeyT" && !event.repeat) {
        event.preventDefault();
        retieKey.current();
        return;
      }
      // The drag is turned in a fight, where its card shows it.
      if (event.code === "KeyF" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && scenePhaseRef.current === "fight") {
        event.preventDefault();
        updateSettings({ drag: nextDrag(savedSettings.drag) });
        return;
      }
      if (event.code === "KeyL" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        lampKey.current();
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

  const onBuyBait = async () => {
    setBusy(true);
    setError("");
    try {
      await buyGroundbait();
      game.addHandful();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("purchase failed"));
    } finally {
      setBusy(false);
    }
  };

  const onBuyShiner = async () => {
    setBusy(true);
    setError("");
    try {
      await buyShiner();
      game.addShiner();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("purchase failed"));
    } finally {
      setBusy(false);
    }
  };

  const onBuyWorm = async () => {
    // The server doesn't see the tin, so a full one must not reach it and be charged for.
    if (game.worms >= WORM_TIN_WET) return;
    setBusy(true);
    setError("");
    try {
      await buyWorm();
      game.addWorm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("purchase failed"));
    } finally {
      setBusy(false);
    }
  };

  /** A one-time shack purchase the server keeps on the profile: the refreshed profile shows it bought. */
  const buyOnce = (buy: typeof buyAerator) => async () => {
    setBusy(true);
    setError("");
    try {
      await buy();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("purchase failed"));
    } finally {
      setBusy(false);
    }
  };
  const onBuyAerator = buyOnce(buyAerator);
  const onBuyWormBin = buyOnce(buyWormBin);
  const onBuyBreadCrumb = buyOnce(buyBreadCrumb);

  if (!me) {
    return <main className="dock-page">{error || t("Walking the planks…")}</main>;
  }

  const dropoffOpen = canUseSpot("dropoff", me.level);
  const fishing = isFishingStance(game.stance);
  const bank = isFishingStance(game.stance) ? game.stance : game.spot;
  const inletOpen = canUseSpot("inlet", me.level);
  const boatOpen = canUseSpot("open", me.level);
  const rowing = boatState === "rowingOut" || boatState === "rowingBack";
  groundbaitKey.current = () => {
    if (fishing && !rowing && game.handfuls > 0 && !shopOpen) game.throwGroundbait();
  };
  lampKey.current = () => {
    if (hour === "night" && !rowing && !shopOpen) game.toggleLamp();
  };
  retieKey.current = () => {
    if (!rowing && (game.frayed || game.twisted || game.dulled || washedWorm) && !shopOpen) game.retie();
  };
  /** A bank the season, hour and weather favor right now, and open at this level: its sign and the stance chip say so. */
  const favoredNow = (target: WalkTarget) =>
    target !== "shop" && (target !== "dropoff" || dropoffOpen) && (target !== "inlet" || inletOpen) && bankSuitsNow(target, lureNow);
  /** A bank whose next cast meets wary fish, unless groundbait there keeps them feeding: its sign is dimmed and the stance chip says so. */
  const fishedHardAt = (target: StanceId) => game.fishedHard.some((bank) => bank === target) && game.groundbait?.spot !== target;
  /** A bank whose bubbles boil in a feeding frenzy right now: its sign carries a star. */
  const frenzyAt = (target: WalkTarget) => game.frenzy && game.hotspot?.spot === target;
  /** What a walk sign tells a screen reader and the tooltip beyond its bank's name. */
  const giantAt = (bank: string) => openGiants.find((giant) => giant.spot === bank);
  const lineState = game.nightLine ? nightLineState(game.nightLine, Date.now()) : null;
  const lineAt = (bank: string) => (game.nightLine?.spot === bank ? lineState : null);
  // A shiner to spare, or a worm from the tin with one tied on as the light goes, can go out on a night line.
  const lineBait = game.liveShiner || game.bucket > 0 ? "shiner" : isLiveBait(lure) && wormLineHour(hour) && game.worms > 0 ? "worm" : null;
  // The bank underfoot's own sign sets a night line with that bait, or brings in the one out there.
  const stanceLine =
    !me || rowing
      ? null
      : lineAt(game.stance) && lineAt(game.stance) !== "soaking"
        ? "check"
        : !game.nightLine && lineBait && isFishingStance(game.stance) && game.stance !== "open" && nightLineKinds(game.stance, me.profile).length > 0
          ? "set"
          : null;
  const lineAction = (target: WalkTarget) => (target === game.stance ? stanceLine : null);
  // A bank whose giant is still out there, or where the night line is out, says so after its other news.
  const signNote = (target: WalkTarget, label: string) => {
    const action = lineAction(target);
    if (action) return action === "set" ? (lineBait === "shiner" ? t("{bank}: leave the shiner out on a night line here", { bank: t(label) }) : t("{bank}: leave a worm out on a night line here", { bank: t(label) })) : t("{bank}: bring in your night line", { bank: t(label) });
    const giant = giantAt(target);
    const note = bankNote(target, label);
    const withGiant = giant ? t("{note} · {name}, its giant, is still out there", { note: note ?? t(label), name: t(giant.name) }) : note;
    return lineAt(target) ? t("{note} · your night line is out here", { note: withGiant ?? t(label) }) : withGiant;
  };
  const bankNote = (target: WalkTarget, label: string) =>
    frenzyAt(target)
      ? fishedHardAt(target)
        ? t("{bank}: feeding frenzy now, but fished hard", { bank: t(label) })
        : t("{bank}: feeding frenzy now", { bank: t(label) })
      : fishedHardAt(target)
      ? favoredNow(target)
        ? t("{bank}: bites sooner now, but fished hard", { bank: t(label) })
        : t("{bank}: fished hard", { bank: t(label) })
      : favoredNow(target)
        ? t("{bank}: bites sooner now", { bank: t(label) })
        : undefined;
  const stanceLabel = rowing
    ? t("Rowing")
    : game.stance === "dropoff" && !dropoffOpen
      ? t("{spot} (lv {level})", { spot: t(STANCE_LABELS.dropoff), level: DROPOFF_LEVEL })
      : game.stance === "inlet" && !inletOpen
        ? t("{spot} (lv {level})", { spot: t(STANCE_LABELS.inlet), level: INLET_LEVEL })
        : t(STANCE_LABELS[game.stance]);

  return (
    <main className="dock-page" data-photo={photo ? "1" : undefined}>
      {photo && (
        <button className="photo-exit" type="button" {...photoDrag.handlers} onClick={() => photoDrag.tapped() && setPhoto(false)}>
          <span>
            {/* A phone has no P, Space or H, so its hint names the button and the tap instead. */}
            {touchScreen()
              ? t("Photo mode. Drag to look around, tap Save this view to keep a picture, or tap anywhere else to bring the panels back.")
              : t("Photo mode. Drag to look around, P or Space to save a picture, H or tap to bring the panels back.")}
          </span>
        </button>
      )}
      {photo && (
        <button className="photo-shutter" type="button" onClick={saveLakePicture} data-photo-shutter>
          {t("Save this view")}
        </button>
      )}
      {photo && pictureNote && (
        <p key={pictureNote.seq} className="photo-note" role="status">
          {pictureNote.saved ? t("Picture saved") : t("The picture could not be saved")}
        </p>
      )}
      <Hud
        profile={me.profile}
        hour={hour}
        sky={sky}
        season={season}
        onSettings={() => setSettingsOpen(true)}
        streak={streakDays(me.recentDays, localDate(new Date())).current}
        moon={moonName(moon)}
        wind={wind.wind}
        onPackUp={session && session.fish.length > 0 && bankClear ? () => setRecap({ leftover: false }) : undefined}
      />
      <div
        className="scene-wrap"
        ref={game.surfaceRef}
        data-phase={scenePhase}
        data-points={me.profile.points}
        data-aim-hint={game.aimHint}
        data-nibble={game.nibble ? "1" : "0"}
        data-hour={hour}
        data-sky={sky}
        data-season={season}
        data-lure={lure}
        data-lure-locked={lureLocked ? "1" : "0"}
        data-storm={storm ? "1" : undefined}
      >
        <FishingWorld
          level={me.level}
          phase={scenePhase}
          spot={bank}
          sim={game.sim}
          nibble={game.nibble}
          schooled={game.schooled}
          lurking={game.lurking}
          lurkerCloseInMs={game.lurkerCloseInMs}
          follow={game.follow}
          giantBanks={giantBanks}
          lostFloatBanks={lostFloatBanks}
          nightLineSpot={game.nightLine?.spot ?? null}
          nightLineState={lineState}
          baitBucket={game.bucket}
          worms={game.worms}
          shinerTrap={game.trap ? trapState(game.trap, Date.now()) : null}
          topwater={isTopwater(lure)}
          hour={hour}
          sky={sky}
          season={season}
          species={shownFish?.species ?? null}
          weight={shownFish?.weight ?? 0}
          golden={landedGolden}
          released={landedReleased}
          moon={moon}
          wind={wind}
          boatSwing={boatSwingShare(game.fight)}
          headlamp={lampLit(game.lamp, hour)}
          hotspot={game.hotspot}
          groundbait={game.groundbait}
          groundbaitPrimed={game.swimPrimed}
          rising={rising}
          storm={storm}
          tracks={tracks}
          powerRef={game.powerRef}
          accuracy={me.profile.accuracy}
        />
        {padCursor && <i className="pad-cursor" aria-hidden style={{ left: padCursor.x, top: padCursor.y }} />}
        {game.phase === "hookset" && (
          <div className="strike-cue" role="alert" style={{ "--strike-ms": `${game.strikeWindowMs || hookWindowMs(me.profile.accuracy, mercy, me.level)}ms` } as CSSProperties}>
            <strong>{t("Strike!")}</strong>
            <span className="cue-keys">{t("Click or Space")}</span>
            <span className="cue-touch">{t("Tap anywhere")}</span>
            <div className="cue-bar">
              <i />
              {/* From level 2, a mark where the shrinking bar passes the last moment for a solid hook. */}
              {showsSolidMark(me.level) && <b aria-hidden style={{ left: `${(1 - solidStrikeMs(1, fightWind(wind.wind), tiedLure.current, false, false, me.level, lureTiers.get(tiedLure.current) === "lucky")) * 100}%` }} />}
            </div>
          </div>
        )}
        {(scenePhase === "waiting" || scenePhase === "hookset" || scenePhase === "fight") && (
          // Space and a tap on the water do the same; this is just where a thumb rests on a phone.
          <button className="thumb-strike" type="button" data-thumb-strike data-phase={scenePhase} tabIndex={-1} aria-hidden>
            {scenePhase === "fight" ? t("Reel") : t("Strike")}
          </button>
        )}
        {scenePhase === "fight" && game.fight && canTurnRuns(game.fight.species.challenge) && (
          // A second thumb holds one of these to pull the rod against a run; keys do the same with ← → or A D.
          <div className="steer-buttons" aria-hidden>
            <button type="button" className="steer-btn" data-steer="-1" tabIndex={-1}>
              ◀
            </button>
            <button type="button" className="steer-btn" data-steer="1" tabIndex={-1}>
              ▶
            </button>
          </div>
        )}
        {fishing && !shopOpen && (
          <PowerMeter phase={scenePhase} powerRef={game.powerRef} lastCastRef={game.lastCastRef} accuracy={me.profile.accuracy} level={me.level} />
        )}
        {prefs.walkStick && !shopOpen && scenePhase === "idle" && <WalkStick />}
        <p className="hint" aria-live="polite" ref={hintRef}>
          {scenePhase !== "hookset" && game.hint}
          {/* The call to strike can't wait for a screen reader to finish a long hint before it (the strike lasts a second
              or two): it alone is said at once. Kept mounted, so the reader is listening before the bite. */}
          <span aria-live="assertive">{scenePhase === "hookset" ? game.hint : ""}</span>
          {scenePhase === "waiting" && game.moreReasons.length > 0 && (
            <>
              {" "}
              {reasonsOpen ? (
                <span>{game.moreReasons.join(" ")}</span>
              ) : (
                <button className="hint-more" type="button" data-camera-control onClick={(event) => {
                  // Off the button, so Space strikes again rather than pressing it.
                  event.currentTarget.blur();
                  setReasonsOpenFor(game.moreReasons);
                }}>
                  {tn(game.moreReasons.length, "{n} more reason", "{n} more reasons")}
                </button>
              )}
            </>
          )}
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
        <WhatsNew caughtTotal={caughtTotal} hidden={scenePhase !== "idle" || shopOpen} />
        <aside className="stance-chip" data-stance={game.stance} aria-label={t("Where you stand")}>
          {stanceLabel}
          {!rowing && game.stance === hotBank && <small className="stance-hot"> · {t("biting today")}</small>}
          {!rowing && !mercy && game.stance === crowdedBank && <small className="stance-cold"> · {t("another angler here today")}</small>}
          {!rowing && isFishingStance(game.stance) && game.stance !== "open" && favoredNow(game.stance) && <small className="stance-hot"> · {t("bites sooner now")}</small>}
          {!rowing && lineAt(game.stance) && (lineAt(game.stance) === "ready" ? <small className="stance-hot"> · {t("night line ready")}</small> : <small className="stance-cold"> · {t(lineAt(game.stance) === "soaking" ? "night line soaking" : "night line left too long")}</small>)}
          {!rowing && game.nightLine && game.nightLine.spot !== game.stance && lineBait && <small className="stance-cold"> · {t("night line out at the {bank}", { bank: t(SPOT_LABELS[game.nightLine.spot]) })}</small>}
          {!rowing && foeAbout(oldFoe, game.stance, Date.now()) && <small className="stance-hot"> · {t("foe about")}</small>}
          {!rowing && lodgeLost.some((lost) => lost.spot === game.stance) && <small className="stance-hot"> · {t("lost trophy")}</small>}
          {!rowing && giantAt(game.stance) && (
            game.giantShy && isFishingStance(game.stance) && shyOf(game.giantShy, game.stance, giantAt(game.stance)!.name, lure)
              ? <small className="stance-cold"> · {t("giant: {name}, shy of this lure", { name: t(giantAt(game.stance)!.name) })}</small>
              : <small className="stance-hot"> · {t("giant: {name}", { name: t(giantAt(game.stance)!.name) })}</small>
          )}
          {rising && <small className="stance-hot"> · {t("fish rising")}</small>}
          {!rowing && clouded && isFishingStance(game.stance) && SHALLOW_BANKS.has(game.stance) && <small className="stance-hot"> · {t("cloud over the sun")}</small>}
          {!rowing && moonPass && isFishingStance(game.stance) && <small className="stance-hot"> · {t(moonPass === "overhead" ? "moon overhead" : "moon underfoot")}</small>}
          {!rowing && game.groundbait?.spot === game.stance && <small className="stance-hot"> · {t("groundbait · {casts} left", { casts: game.groundbait.casts })}</small>}
          {!rowing && fishedHardAt(game.stance) && <small className="stance-cold"> · {t("fished hard")}</small>}
          {!rowing && !mercy && isFishingStance(game.stance) && fishedDownBanks.has(game.stance) && <small className="stance-cold"> · {t("fished down this week")}</small>}
          {!rowing && !mercy && isFishingStance(game.stance) && longShadowWaitMul(game.stance, hour, sky) > 1 && <small className="stance-cold"> · {t("your shadow on the water")}</small>}
          {game.frayed && <small className="stance-cold"> · {t("line frayed")}</small>}
          {game.twisted && <small className="stance-cold"> · {t("line twisted")}</small>}
          {game.dulled && <small className="stance-cold"> · {t("hook dulled")}</small>}
          {washedWorm && <small className="stance-cold"> · {t("worm washed out")}</small>}
          {isLiveBait(lure) && game.worms === 0 && (washedWorm || (wormLineHour(hour) && !game.nightLine)) && <small className="stance-cold"> · {t("worm tin empty")}</small>}
          {game.liveShiner && <small className="stance-hot"> · {t("live shiner on")}</small>}
        </aside>
        <LureChoice
          choices={lureChoices}
          value={lure}
          spot={bank}
          now={lureNow}
          tierOf={(choice) => lureTiers.get(choice) ?? null}
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
            {fishing && !rowing && game.handfuls > 0 && (
              <button
                className="panel-btn walk-bait"
                type="button"
                aria-label={t("Groundbait")}
                title={t("Toss a handful of groundbait here: the next {casts} casts bite sooner.", { casts: GROUNDBAIT_CASTS })}
                onClick={(event) => {
                  // Leave Space free for casting.
                  event.currentTarget.blur();
                  game.throwGroundbait();
                }}
              >
                {/* A phone's sign row has no room for the long word, so it shows the short one; the label keeps the full name. */}
                <span className="bait-full">{t("Groundbait")}</span>
                <span className="bait-short" aria-hidden="true">{t("Bait")}</span>
              </button>
            )}
            {fishing && !rowing && (
              <button
                className="panel-btn"
                type="button"
                title={t("Change the line: light line brings more bites but snaps sooner, heavy line holds more but the fish see it.")}
                aria-label={`${t(LINE_WORD[prefs.line])}. ${t("Change the line: light line brings more bites but snaps sooner, heavy line holds more but the fish see it.")}`}
                onClick={(event) => {
                  // Leave Space free for casting.
                  event.currentTarget.blur();
                  updateSettings({ line: nextLine(prefs.line) });
                }}
              >
                {/* A phone's sign row has no room for the long words, so it shows the short one; the label keeps the full name. */}
                <span className="bait-full">{t(LINE_WORD[prefs.line])}</span>
                <span className="bait-short" aria-hidden="true">{t(LINE_SHORT[prefs.line])}</span>
              </button>
            )}
            {hour === "night" && !rowing && (
              <button
                className="panel-btn"
                type="button"
                aria-pressed={game.lamp}
                title={t("A headlamp shows the float plainly, so the strike holds longer, but its light on the water puts the fish off.")}
                onClick={(event) => {
                  // Leave Space free for casting.
                  event.currentTarget.blur();
                  game.toggleLamp();
                }}
              >
                {t("Headlamp")}
              </button>
            )}
            {!rowing && (game.frayed || game.twisted || game.dulled || washedWorm) && (
              <button
                className="panel-btn walk-retie"
                type="button"
                title={
                  game.frayed
                    ? t("Retie the frayed line, so it holds full strain again.")
                    : game.twisted
                      ? t("Retie the twisted line, so it casts clean again.")
                      : game.dulled
                        ? t("Touch up the dull hook, so it sets solid again.")
                        : game.worms > 0
                          ? t("Put a fresh worm from your tin on, so its scent draws the fish again. Worms in the tin: {worms}.", { worms: game.worms })
                          : t("Your worm tin is empty, so the washed-out worm stays on. More worms are dug each day, or the shack sells one.")
                }
                onClick={(event) => {
                  // Leave Space free for casting.
                  event.currentTarget.blur();
                  game.retie();
                }}
              >
                {game.frayed || game.twisted || game.dulled ? t("Retie") : t("Rebait")}
              </button>
            )}
            {!aboard(boatState) && SIGNPOSTS.filter(({ target }) => target !== "inlet" || inletOpen).map(({ target, label }) => (
              <button
                key={target}
                className="panel-btn"
                type="button"
                aria-current={game.stance === target ? "location" : undefined}
                aria-label={signNote(target, label)}
                title={signNote(target, label)}
                data-now={favoredNow(target) ? "1" : undefined}
                data-cold={fishedHardAt(target) ? "1" : undefined}
                disabled={game.stance === target && !lineAction(target)}
                onClick={(event) => {
                  // Leave Space free for casting.
                  event.currentTarget.blur();
                  const action = lineAction(target);
                  if (action === "set") game.setNightLine();
                  else if (action === "check") game.checkNightLine();
                  else walkAnglerTo(WALK_TARGETS[target].x, WALK_TARGETS[target].z);
                }}
              >
                {lineAction(target) === "set" ? t("Night line") : lineAction(target) === "check" ? t("Check line") : t(label)}
                {lineAt(target) && !lineAction(target) && <span className="sign-line" aria-hidden="true"> ≈</span>}
                {favoredNow(target) && <span className="sign-now" aria-hidden="true"> •</span>}
                {frenzyAt(target) && <span className="sign-frenzy" aria-hidden="true"> ✦</span>}
                {giantAt(target) && <span className="sign-giant" aria-hidden="true"> ♦</span>}
              </button>
            ))}
          </nav>
        )}
        {padConnected ? (
          <aside className="camera-help" data-camera-control data-pad aria-label={t("Controls")}>
            <span>{t("Controller")}</span>
            <kbd>{t("Left stick")}</kbd> {t("walk")}
            <kbd>{t("Right stick")}</kbd> {t("aim")}
            <kbd>A</kbd> {t("cast, strike, reel")}
            <kbd>Y</kbd> {t("shop")}
            <kbd>B</kbd> {t("close")}
          </aside>
        ) : touchScreen() ? (
          <aside className="camera-help" data-camera-control data-touch aria-label={t("Controls")}>
            <span>{t("Shore")}</span>
            {prefs.walkStick && (
              <>
                <kbd>{t("Stick")}</kbd> {t("or")}{" "}
              </>
            )}
            <kbd>{t("Tap shore")}</kbd> {t("walk")}
            <kbd>{t("Touch water")}</kbd> {t("aim")}
            <kbd>{t("Two fingers")}</kbd> {t("look")}
          </aside>
        ) : (
          <aside className="camera-help" data-camera-control aria-label={t("Controls")}>
            <span>{t("Shore")}</span>
            <kbd>WASD</kbd> {t("or")} <kbd>{t("Click shore")}</kbd> {t("walk")}
            <kbd>{t("Click water")}</kbd> {t("or")} <kbd>{t("Arrows")}</kbd> {t("aim")}
            <kbd>E</kbd> {t("shop")}
            <kbd>{t("Right drag")}</kbd> {t("look")}
          </aside>
        )}
        {game.fight && !game.outcome && <FightBar fight={game.fight} sim={game.sim} performance={game.performance} best={fightBest} note={hookNote} cleanRun={game.cleanRun} />}
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
            <h2 ref={landedHeading} tabIndex={-1}>
              {t(game.outcome.species.name)}
            </h2>
            <p className="catch-lore">{t(game.outcome.species.lore)}</p>
            <p className="catch-lure">{t(lure)}</p>
            <p>{weightText(game.outcome.weight)} · {t(SPOT_LABELS[game.outcome.spot])}</p>
            <p>
              {t("+{points} pts", {
                // Once the catch is saved the card shows what the server paid; till then, what it should.
                points: savedLanded?.points ?? catchPoints(
                  game.outcome.species,
                  game.outcome.weight,
                  game.outcome.clean,
                  weeklyBonus(game.outcome.species.id, landedDay.current) * (landedGolden ? GOLDEN_BONUS : 1) * cleanRunBonus(game.outcome.clean, game.outcome.notes?.cleanRun) * (lodgeTaken ? LODGE_RECORD_BONUS : stamp?.kind === "pb" ? PB_BONUS : 1) * (dayRun > 0 ? DAY_RUN_BONUS : 1) * masteryBonus(priorCaught),
                ) + (game.outcome.tag ? TAG_FINDER_BONUS : 0) + (game.outcome.giant ? (game.outcome.giantBonus ?? GIANT_BONUS) : 0) + (game.outcome.lostFrom ? LOST_FINDER_BONUS : 0),
              })}
            </p>
            {landedGolden && paid("golden", true) && <p className="catch-stamp golden">{t("Golden fish · 2× points")}</p>}
            {game.outcome.giant && paid("giant", true) && <p className="catch-stamp golden">{t("{name}, the bank's giant · +{points} pts", { name: t(game.outcome.giant), points: game.outcome.giantBonus ?? GIANT_BONUS })}</p>}
            {game.outcome.lostFrom && paid("found", true) && <p className="catch-stamp">{t("{name}'s lost trophy · +{points} pts", { name: game.outcome.lostFrom.by, points: LOST_FINDER_BONUS })}</p>}
            {game.outcome.tag && paid("tag", true) && <p className="catch-stamp">{t("Tagged by {name} · +{points} pts, and {back} for them", { name: game.outcome.tag.by, points: TAG_FINDER_BONUS, back: TAG_RETURN_BONUS })}</p>}
            {paid("weekly", weeklyBonus(game.outcome.species.id, landedDay.current) > 1) && <p className="catch-stamp">{t("Fish of the week · 1.5× points")}</p>}
            {game.outcome.clean && (
              <p className="catch-stamp">
                {(game.outcome.notes?.cleanRun ?? 0) >= CLEAN_RUN_FROM && paid("cleanRun", true)
                  ? t("Clean fight · {n} in a row · 1.2× points", { n: game.outcome.notes!.cleanRun! })
                  : t("Clean fight")}
              </p>
            )}
            {fightNotesText(game.outcome.notes) && <p className="catch-stamp quiet fight-notes">{fightNotesText(game.outcome.notes)}</p>}
            {paid("dayRun", dayRun > 0) && (
              <p className="catch-stamp">{dayRun > 0 ? t("First fish of day {n} in a row · 1.5× points", { n: dayRun }) : t("First fish of a run of days · 1.5× points")}</p>
            )}
            {stamp?.kind === "first" && <p className="catch-stamp">{t("New in the field guide")}</p>}
            {tierReached && (
              <p className="catch-stamp">
                {tierReached.id === "known"
                  ? t("Known fish: {fish} · {n} landed", { fish: t(game.outcome.species.name), n: priorCaught + 1 })
                  : tierReached.id === "skilled"
                    ? t("Skilled: {fish} · {n} landed", { fish: t(game.outcome.species.name), n: priorCaught + 1 })
                    : t("Mastered: {fish} · 1.1× points from the next one", { fish: t(game.outcome.species.name) })}
              </p>
            )}
            {paid("mastery", masteryBonus(priorCaught) > 1) && <p className="catch-stamp">{t("Mastered kind · 1.1× points")}</p>}
            {stamp?.kind === "pb" && (
              <p className="catch-stamp">
                {paid("pb", !lodgeTaken) ? t("Personal best · was {weight} · 1.25× points", { weight: weightText(stamp.previous) }) : t("Personal best · was {weight}", { weight: weightText(stamp.previous) })}
              </p>
            )}
            {stamp?.kind === "repeat" && (
              <p className="catch-stamp quiet">{t("Book PB {weight}", { weight: weightText(stamp.heaviest) })}</p>
            )}
            {stamp?.trophy && <p className="catch-stamp">{t("Trophy")}</p>}
            {slam && <p className="catch-stamp">{t("{slam} · every kind in one day", { slam: t(badgeById(slam)?.label ?? slam) })}</p>}
            {lureReached && <p className="catch-stamp">{t("{lure} is now {tier}", { lure: t(tiedLure.current), tier: t(LURE_TIER_WORD[lureReached]) })}</p>}
            {dayBag && (
              <p className="catch-stamp quiet day-bag">
                {dayBag.raisedBy > 0
                  ? t("Day's bag {weight} in {n} fish · up {more}", { weight: weightText(bagTotal(dayBag.bag)), n: dayBag.bag.length, more: weightText(dayBag.raisedBy) })
                  : t("Day's bag {weight} · beat {least} to raise it", { weight: weightText(bagTotal(dayBag.bag)), least: weightText(bagToBeat(dayBag.bag) ?? 0) })}
              </p>
            )}
            {lodge?.kind === "first" && <p className="catch-stamp">{t("First on the lodge wall")}</p>}
            {/* The server took the record from another angler where this card's lodge board was out of date. */}
            {paid("lodgeRecord", false) && !(lodge?.kind === "record" && !lodge.yours) && <p className="catch-stamp">{t("Lodge record · 1.5× points")}</p>}
            {lodge?.kind === "record" && (
              <p className="catch-stamp">
                {lodge.yours
                  ? t("Lodge record · beat your {weight}", { weight: weightText(lodge.previous) })
                  : !paid("lodgeRecord", true)
                    ? t("Lodge record · was {weight} ({holder})", { weight: weightText(lodge.previous), holder: lodge.holder })
                  : t("Lodge record · was {weight} ({holder}) · 1.5× points", { weight: weightText(lodge.previous), holder: lodge.holder })}
              </p>
            )}
            {game.outcome.note && (
              <p className="catch-note" role="status">
                {game.outcome.note}
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
                <p className="catch-stamp released" ref={releasedNote} tabIndex={-1}>
                  {/* Named by what the server paid: a trophy, a guarder back to its nest, or both. */}
                  {paidReleaseBonus === TROPHY_RELEASE_BONUS + NEST_RELEASE_BONUS
                    ? t("Released back to its nest · +{bonus} pts for a trophy guarder", { bonus: paidReleaseBonus })
                    : paidReleaseBonus === NEST_RELEASE_BONUS
                      ? t("Released back to its nest · +{bonus} pts", { bonus: paidReleaseBonus })
                      : paidReleaseBonus > 0
                        ? t("Released back into the lake · +{bonus} pts for letting a trophy go", { bonus: paidReleaseBonus })
                        : t("Released back into the lake")}
                  {/* A fish the lake remembers shies from the lure it was caught on. */}
                  {game.outcome.lure && remembersReleased(game.outcome.species) && ` · ${t("it will shy from the {lure} now", { lure: t(game.outcome.lure) })}`}
                  {firstGiant(game.outcome) && ` · ${t("{name} is out again for the week", { name: t(game.outcome.giant!) })}`}
                </p>
              ) : (
                <button className="panel-btn" type="button" onClick={() => void releaseFish()} aria-disabled={releasing || undefined}>
                  {releasing
                    ? t("Releasing…")
                    : releaseOffer.nest
                      ? t("Release to its nest · +{bonus} pts", { bonus: releaseOffer.bonus })
                      : releaseOffer.bonus > 0
                        ? t("Release · +{bonus} pts", { bonus: releaseOffer.bonus })
                        : t("Release")}
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
              {/* A shiner goes back out on the hook as live bait, for the pike and bass that hunt it. */}
              {/* A shiner landed clean is lively, so it takes the place of a plain one on the hook. */}
              {!landedReleased && canBaitShiner(game.outcome.species.id) && (!game.liveShiner || (game.outcome.clean && !game.livelyShiner) ? (
                <button className="panel-btn" type="button" onClick={game.baitShiner} title={game.outcome.clean ? t("Hook it on as live bait: landed clean, it's lively and draws more of the hunters here.") : t("Hook it on as live bait: the next cast draws the hunters here. A shiner landed in a clean fight is livelier.")}>
                  {t("Use it as bait")}
                </button>
              ) : game.bucket < BUCKET_SIZE && (
                <button className="panel-btn" type="button" onClick={game.baitShiner} title={t("A shiner is on your hook already, so this one goes in your bait bucket for later.")}>
                  {t("Keep it in the bucket")}
                </button>
              ))}
              {fieldLogError && (
                <button className="panel-btn" type="button" onClick={saveFieldLog}>
                  {t("Try saving again")}
                </button>
              )}
              {/* Once the fish is in the book, the button opens its page there. */}
              <Link
                className="panel-btn"
                to={fieldSaved && game.outcome?.kind === "landed" ? `/catches/${game.outcome.id}` : "/catches"}
              >
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
          <div className="hour-veil" key={veil.kind === "hour" ? veil.hour : `sky-${veil.sky}`} role="status">
            <strong>{veil.kind === "hour" ? hourTurnLine(veil.hour) : skyTurnLine(veil.from, veil.sky, season)}</strong>
            <span>{t(veil.kind === "hour" ? LAKE_HOUR_BLURB[veil.hour] : skyBlurb(veil.sky, season))}</span>
          </div>
        )}
        <SoundCaptions />
        {/* A missed or broken-off fish is said aloud too: the toast that shows it comes and goes, so its words go here. */}
        <p className="sr-only" role="status">
          {game.outcome && game.outcome.kind !== "landed" ? game.outcome.message : ""}
        </p>
        {/* Mounted empty so screen readers announce the toast when it fills in. */}
        <div className="level-status" role="status">
          {effectsNotice && (
            <div className="toast effects-toast">
              <p>{t("Effects set to Lite to keep the lake smooth, with shadows off and a faster picture from the next visit. Settings can turn them back.")}</p>
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
          {shownTag && !shownLevel && !shownBadges && (
            <div className="toast level-toast badge-toast">
              <span className="eyebrow">{t("Your tag came back")}</span>
              <h2>{t("{name} landed your {fish}", { name: shownTag.by, fish: t(fishById(shownTag.speciesId)?.name ?? shownTag.speciesId).toLowerCase() })}</h2>
              <p>{t("You let it go at {was}; it came back at {weight} · +{points} pts", { was: weightText(shownTag.was), weight: weightText(shownTag.weight), points: TAG_RETURN_BONUS })}</p>
            </div>
          )}
          {shownLost && (
            <div className="toast level-toast badge-toast">
              <span className="eyebrow">{t("Your lost trophy was found")}</span>
              <h2>{t("{name} landed the {fish} that broke your line", { name: shownLost.by, fish: t(fishById(shownLost.speciesId)?.name ?? shownLost.speciesId).toLowerCase() })}</h2>
              <p>{t("{weight} at the {bank}", { weight: weightText(shownLost.weight), bank: t(SPOT_LABELS[shownLost.spot]) })}</p>
            </div>
          )}
        </div>
        {shopOpen && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-title" ref={shopPanel} tabIndex={-1}>
            {/* The shack's sections are h3s: its own name, unseen, is the h2 between them and the page's h1. */}
            <h2 id="shop-title" className="sr-only">
              {t("The shack")}
            </h2>
            <UpgradePanel profile={me.profile} busy={busy || scenePhase !== "idle"} onBuy={onBuy} />
            <BaitShop points={me.profile.points} lifetimePoints={me.profile.lifetimePoints} handfuls={game.handfuls} shinerOn={game.liveShiner} bucket={game.bucket} busy={busy || scenePhase !== "idle"} onBuy={onBuyBait} onBuyShiner={onBuyShiner} onHookFromBucket={game.hookFromBucket} aerator={game.aerator} onBuyAerator={onBuyAerator} worms={game.worms} onBuyWorm={onBuyWorm} wormBin={game.wormBin} onBuyWormBin={onBuyWormBin} breadCrumb={game.breadCrumb} onBuyBreadCrumb={onBuyBreadCrumb} trap={game.trap ? trapState(game.trap, Date.now()) : "none"} trapCold={game.trap ? game.trap.cold === true : trapIsCold(season)} onSetTrap={game.setTrap} onLiftTrap={game.liftTrap} season={season} />
            <DailyRequestsPanel key={userId} catchKey={me.catches[0]?.id} onClaimed={refresh} />
            <WeeklyChallengesPanel key={`week-${userId}`} catchKey={me.catches[0]?.id} onClaimed={refresh} />
            <ForecastBoard />
            <div className="shop-foot">
              {error && (
                <p className="warn" role="alert">
                  {error}
                </p>
              )}
              <button className="panel-btn" type="button" onClick={() => setShopOpen(false)}>
                {t("Back to the path")}
              </button>
            </div>
          </div>
        )}
      </div>
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onKeys={() => {
            setSettingsOpen(false);
            setKeysOpen(true);
          }}
          onPhoto={
            photoAllowed
              ? () => {
                  setSettingsOpen(false);
                  setPhoto(true);
                }
              : undefined
          }
        />
      )}
      {keysOpen && <KeysCard onClose={() => setKeysOpen(false)} />}
      {recap && (session || filedTrip) && (
        <TripRecap
          draft={session ?? { id: filedTrip!.id, date: "", sky, fish: [] }}
          leftover={recap.leftover}
          filed={filedTrip}
          onFile={fileTrip}
          onClose={closeRecap}
        />
      )}
    </main>
  );
}
