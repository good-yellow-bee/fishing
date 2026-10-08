import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  canUseSpot,
  catchPoints,
  catchStamp,
  fieldLogBestBeat,
  isFishingStance,
  lakeHour,
  lakeHourFromSearch,
  luresPacked,
  sampleLogbook,
  STANCE_LABELS,
  SPOT_LABELS,
  type SkillId,
} from "@stillwater/shared";
import { buyUpgrade, getMe, recordCatch, type Me } from "../api";
import { FightBar } from "../components/FightBar";
import { Hud } from "../components/Hud";
import { LureChoice } from "../components/LureChoice";
import { UpgradePanel } from "../components/UpgradePanel";
import { saveLandedCatch } from "../field/keepCatch";
import { readTackle } from "../field/gear/storage";
import { readStoredLogbook } from "../field/storage";
import { fx } from "../game/fx";
import { lureCanChange } from "../game/lureChoice";
import { FishingWorld } from "../game/scene/FishingWorld";
import { PowerMeter } from "../game/scene/PowerMeter";
import { useFishingGame } from "../game/useFishingGame";
import { pendingCatches, queueCatch, rejectedCatches, syncCatches } from "../game/pendingCatches";

export function DockPage() {
  const [params] = useSearchParams();
  const [clockHour] = useState(() => lakeHour());
  const hour = lakeHourFromSearch(params.toString()) ?? clockHour;
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shopOpen, setShopOpen] = useState(false);
  const [lureChoices] = useState(() => luresPacked(readTackle()));
  const [chosenLure, setChosenLure] = useState(() => lureChoices[0] ?? "Bobber");
  const tiedLure = useRef(chosenLure);
  const game = useFishingGame(me?.profile ?? null, hour, tiedLure);
  const scenePhase = game.outcome ? "result" : game.phase;
  if (lureCanChange(scenePhase)) tiedLure.current = chosenLure;
  const lure = tiedLure.current;
  const lureLocked = !lureCanChange(scenePhase);
  const posted = useRef<string | null>(null);
  const syncing = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [catchSaveError, setCatchSaveError] = useState("");
  const userId = me?.profile.userId;
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

  const syncPending = useCallback(async () => {
    if (!userId || syncing.current) return;
    syncing.current = true;
    setCatchSaveError("");
    try {
      await syncCatches(userId, recordCatch);
      setPendingCount(0);
      setRejectedCount(rejectedCatches(userId).length);
      await refresh();
    } catch (err) {
      setCatchSaveError(err instanceof Error ? err.message : "The catch could not be saved to the server.");
    } finally {
      syncing.current = false;
    }
  }, [refresh, userId]);

  const retryServerSave = () => {
    if (userId && game.outcome?.kind === "landed" && posted.current !== game.outcome.id) {
      try {
        queueCatch(userId, {
          requestId: game.outcome.id,
          speciesId: game.outcome.species.id,
          weight: game.outcome.weight,
          spot: game.outcome.spot,
        });
        posted.current = game.outcome.id;
        setPendingCount(pendingCatches(userId).length);
      } catch (err) {
        setCatchSaveError(err instanceof Error ? err.message : "The catch could not be queued for saving.");
        return;
      }
    }
    void syncPending();
  };

  useEffect(() => {
    if (!userId) return;
    try {
      setPendingCount(pendingCatches(userId).length);
      setRejectedCount(rejectedCatches(userId).length);
    } catch (err) {
      setCatchSaveError(err instanceof Error ? err.message : "Pending catches could not be read.");
      return;
    }
    void syncPending();
    const onOnline = () => { void syncPending(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncPending, userId]);

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, [refresh]);

  useEffect(() => () => fx.ambient.stop(), []);

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
      });
      setFieldSaved(true);
      setFieldLogError("");
    } catch (err) {
      setFieldSaved(false);
      setFieldLogError(err instanceof Error ? err.message : "The field log could not be saved.");
    }
  }, [game.outcome]);

  useEffect(() => {
    if (game.outcome?.kind !== "landed") {
      posted.current = null;
      setFieldSaved(false);
      setFieldLogError("");
      return;
    }
    const { id, species, weight, spot: catchSpot } = game.outcome;
    if (posted.current === id) return;
    saveFieldLog();
    if (!userId) return;
    try {
      queueCatch(userId, { requestId: id, speciesId: species.id, weight, spot: catchSpot });
      posted.current = id;
      setPendingCount(pendingCatches(userId).length);
      void syncPending();
    } catch (err) {
      setCatchSaveError(err instanceof Error ? err.message : "The catch could not be queued for saving.");
    }
  }, [game.outcome, saveFieldLog, syncPending, userId]);

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
      <Hud profile={me.profile} email={me.user.email} hour={hour} />
      <div
        className="scene-wrap"
        ref={game.surfaceRef}
        data-phase={scenePhase}
        data-points={me.profile.points}
        data-power={game.power.toFixed(2)}
        data-aim-hint={game.aimHint}
        data-nibble={game.nibble ? "1" : "0"}
        data-hour={hour}
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
          species={
            game.outcome?.kind === "landed" ? game.outcome.species : (game.fight?.species ?? null)
          }
          weight={game.outcome?.kind === "landed" ? game.outcome.weight : (game.fight?.weight ?? 0)}
        />
        {fishing && !shopOpen && (
          <PowerMeter phase={scenePhase} power={game.power} accuracy={me.profile.accuracy} />
        )}
        <p className="hint">{game.hint}</p>
        {(pendingCount > 0 || catchSaveError || rejectedCount > 0) && (
          <aside className="catch-sync" data-camera-control role="status">
            {(pendingCount > 0 || catchSaveError) && (
              <>
                <p>{catchSaveError || `${pendingCount} catch${pendingCount === 1 ? "" : "es"} waiting to sync.`}</p>
                <button className="panel-btn" type="button" onClick={retryServerSave}>Retry server save</button>
              </>
            )}
            {rejectedCount > 0 && (
              <>
                <p>{rejectedCount} catch{rejectedCount === 1 ? "" : "es"} could not be verified. Your field-log entries are kept.</p>
                <button className="panel-btn" type="button" onClick={() => setRejectedCount(0)}>Dismiss</button>
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
            setChosenLure(next);
          }}
        />
        <aside className="camera-help" data-camera-control>
          <span>Shore</span>
          <kbd>WASD</kbd> walk
          <kbd>Click water</kbd> aim
          <kbd>E</kbd> shop
          <kbd>Right drag</kbd> look
        </aside>
        {game.fight && !game.outcome && <FightBar fight={game.fight} sim={game.sim} />}
        {game.outcome?.kind === "landed" && (
          <div className={`catch-card rarity-${game.outcome.species.rarity}`}>
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
            <p>+{catchPoints(game.outcome.species, game.outcome.weight)} pts</p>
            {stamp?.kind === "first" && <p className="catch-stamp">New in the field guide</p>}
            {stamp?.kind === "pb" && (
              <p className="catch-stamp">Personal best · was {stamp.previous.toFixed(1)} lb</p>
            )}
            {stamp?.kind === "repeat" && (
              <p className="catch-stamp quiet">Book PB {stamp.heaviest.toFixed(1)} lb</p>
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
