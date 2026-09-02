import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  canUseSpot,
  catchPoints,
  catchStamp,
  lakeHour,
  lakeHourFromSearch,
  LAKE_HOUR_BLURB,
  SPOT_IDS,
  SPOT_LABELS,
  type SkillId,
} from "@stillwater/shared";
import { buyUpgrade, getMe, recordCatch, type Me } from "../api";
import { FightBar } from "../components/FightBar";
import { Hud } from "../components/Hud";
import { UpgradePanel } from "../components/UpgradePanel";
import { fx } from "../game/fx";
import { FishingWorld } from "../game/scene/FishingWorld";
import { PowerMeter } from "../game/scene/PowerMeter";
import { useFishingGame } from "../game/useFishingGame";

export function DockPage() {
  const [params] = useSearchParams();
  const [clockHour] = useState(() => lakeHour());
  const hour = lakeHourFromSearch(params.toString()) ?? clockHour;
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const game = useFishingGame(me?.profile ?? null, hour);
  const scenePhase = game.outcome ? "result" : game.phase;
  const posted = useRef<string | null>(null);
  const statsRef = useRef(me?.speciesStats ?? []);
  statsRef.current = me?.speciesStats ?? [];
  const stamp = useMemo(() => {
    if (game.outcome?.kind !== "landed") return null;
    return catchStamp(statsRef.current, game.outcome.species.id, game.outcome.weight);
  }, [game.outcome]);

  const refresh = useCallback(() => {
    return getMe().then(setMe);
  }, []);

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, [refresh]);

  useEffect(() => () => fx.ambient.stop(), []);

  useEffect(() => {
    if (game.outcome?.kind !== "landed") {
      posted.current = null;
      return;
    }
    const { species, weight, spot: catchSpot } = game.outcome;
    const key = `${species.id}:${weight}:${catchSpot}`;
    if (posted.current === key) return;
    posted.current = key;
    setBusy(true);
    recordCatch({ speciesId: species.id, weight, spot: catchSpot })
      .then(() => refresh())
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(false));
  }, [game.outcome, refresh]);

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
  const aiming = game.aimHint === "shore" ? "Shore" : SPOT_LABELS[game.aimHint];

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
      >
        <FishingWorld
          phase={scenePhase}
          power={game.power}
          spot={game.spot}
          sim={game.sim}
          nibble={game.nibble}
          hour={hour}
          species={
            game.outcome?.kind === "landed" ? game.outcome.species : (game.fight?.species ?? null)
          }
          weight={game.outcome?.kind === "landed" ? game.outcome.weight : (game.fight?.weight ?? 0)}
        />
        <PowerMeter phase={scenePhase} power={game.power} accuracy={me.profile.accuracy} />
        <p className="hint">{game.hint}</p>
        <aside className="camera-help" data-camera-control>
          <span>Explore the lake</span>
          <kbd>Click water</kbd> aim
          <kbd>Right drag</kbd> orbit
          <kbd>Wheel</kbd> zoom
          <kbd>WASD</kbd> move
        </aside>
        {game.fight && !game.outcome && <FightBar fight={game.fight} sim={game.sim} />}
        {game.outcome?.kind === "landed" && (
          <div className={`catch-card rarity-${game.outcome.species.rarity}`}>
            <span className="rarity-tag">{game.outcome.species.rarity}</span>
            <h2>{game.outcome.species.name}</h2>
            <p>{game.outcome.weight.toFixed(1)} lb · {SPOT_LABELS[game.outcome.spot]}</p>
            <p>+{catchPoints(game.outcome.species, game.outcome.weight)} pts</p>
            {stamp?.kind === "first" && <p className="catch-stamp">New in the field guide</p>}
            {stamp?.kind === "pb" && (
              <p className="catch-stamp">Personal best · was {stamp.previous.toFixed(1)} lb</p>
            )}
            {stamp?.kind === "repeat" && (
              <p className="catch-stamp quiet">Book PB {stamp.heaviest.toFixed(1)} lb</p>
            )}
            <button className="panel-btn" type="button" onClick={game.dismissResult}>
              Keep fishing
            </button>
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
      </div>
      <footer className="dock-footer">
        <section className="spot-panel">
          <div className="panel-heading">
            <span className="eyebrow">Aiming at</span>
            <h3 data-aiming={game.aimHint}>{aiming}</h3>
          </div>
          <div className="spot-row">
            {SPOT_IDS.map((id) => {
              const locked = id === "dropoff" && !dropoffOpen;
              return (
                <span
                  key={id}
                  className={game.aimHint === id ? "active" : ""}
                  data-locked={locked ? "true" : "false"}
                >
                  {SPOT_LABELS[id]}
                  {locked ? " (lv 3)" : ""}
                </span>
              );
            })}
          </div>
          <p className="spot-legend">{LAKE_HOUR_BLURB[hour]}</p>
          <p className="spot-legend">Left bank reeds · close water dock · far dark basin drop-off</p>
          {error && <p className="warn">{error}</p>}
        </section>
        <UpgradePanel profile={me.profile} busy={busy || scenePhase !== "idle"} onBuy={onBuy} />
      </footer>
    </div>
  );
}
