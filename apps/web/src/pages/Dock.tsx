import { useCallback, useEffect, useRef, useState } from "react";
import { canUseSpot, type SkillId, type SpotId } from "@stillwater/shared";
import { buyUpgrade, getMe, recordCatch, type Me } from "../api";
import { Hud } from "../components/Hud";
import { UpgradePanel } from "../components/UpgradePanel";
import { FightOverlay } from "../game/challenges/FightOverlay";
import { FishingWorld } from "../game/scene/FishingWorld";
import { PowerMeter } from "../game/scene/PowerMeter";
import { useFishingGame } from "../game/useFishingGame";

const spots: { id: SpotId; label: string }[] = [
  { id: "dock", label: "Dock" },
  { id: "reeds", label: "Reeds" },
  { id: "dropoff", label: "Drop-off" },
];

export function DockPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [spot, setSpot] = useState<SpotId>("dock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const game = useFishingGame(me?.profile ?? null, spot);
  const scenePhase = game.outcome ? "result" : game.phase;
  const posted = useRef<string | null>(null);

  const refresh = useCallback(() => {
    return getMe().then(setMe);
  }, []);

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, [refresh]);

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

  return (
    <div className="dock-page">
      <Hud profile={me.profile} email={me.user.email} />
      <div className="scene-wrap" ref={game.surfaceRef} data-phase={scenePhase} data-points={me.profile.points} data-power={game.power.toFixed(2)}>
        <FishingWorld phase={scenePhase} power={game.power} spot={spot} />
        <PowerMeter phase={scenePhase} power={game.power} accuracy={me.profile.accuracy} />
        <p className="hint">{game.hint}</p>
        <aside className="camera-help" data-camera-control>
          <span>Explore the lake</span>
          <kbd>Right drag</kbd> orbit
          <kbd>Wheel</kbd> zoom
          <kbd>WASD</kbd> move
        </aside>
        {game.fight && (
          <FightOverlay
            fight={game.fight}
            accuracy={me.profile.accuracy}
            strength={me.profile.strength}
            onSuccess={game.onFightSuccess}
            onFail={game.onFightFail}
          />
        )}
        {game.outcome?.kind === "landed" && (
          <div className="catch-card">
            <h2>{game.outcome.species.name}</h2>
            <p>{game.outcome.weight.toFixed(1)} lb</p>
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
            <span className="eyebrow">Cast toward</span>
            <h3>Fishing spot</h3>
          </div>
          <div className="spot-row">
            {spots.map((item) => {
              const available = canUseSpot(item.id, me.level);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={spot === item.id ? "active" : ""}
                  disabled={!available || scenePhase !== "idle"}
                  onClick={() => setSpot(item.id)}
                >
                  {item.label}
                  {!available ? " (lv 3)" : ""}
                </button>
              );
            })}
          </div>
          {error && <p className="warn">{error}</p>}
        </section>
        <UpgradePanel profile={me.profile} busy={busy || scenePhase !== "idle"} onBuy={onBuy} />
      </footer>
    </div>
  );
}
