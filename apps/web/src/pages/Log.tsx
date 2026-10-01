import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fishById, SPOT_LABELS } from "@stillwater/shared";
import { getMe, type Me } from "../api";
import { FieldGuide } from "../components/FieldGuide";

export function LogPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <div className="log-page">{error}</div>;
  if (!me) return <div className="log-page">Loading the log…</div>;

  const catches = me.catches;
  const totalWeight = catches.reduce((sum, row) => sum + row.weight, 0);
  const heaviest = catches.reduce<(typeof catches)[number] | null>(
    (best, row) => (!best || row.weight > best.weight ? row : best),
    null,
  );

  return (
    <div className="log-page">
      <p>
        <Link to="/play">Back to the dock</Link>
        {" · "}
        <Link to="/board">Lodge board</Link>
      </p>
      <h1>{me.profile.displayName}&rsquo;s catch log</h1>
      <p>
        {me.profile.lifetimePoints} lifetime points · {catches.length} recent fish
      </p>
      <FieldGuide stats={me.speciesStats} />
      {heaviest && (
        <div className="log-summary">
          <div>
            <span className="eyebrow">Recent</span>
            <strong>{catches.length}</strong>
          </div>
          <div>
            <span className="eyebrow">Total weight</span>
            <strong>{totalWeight.toFixed(1)} lb</strong>
          </div>
          <div>
            <span className="eyebrow">Heaviest</span>
            <strong>{heaviest.weight.toFixed(1)} lb</strong>
            <small>{fishById(heaviest.speciesId)?.name ?? heaviest.speciesId}</small>
          </div>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Fish</th>
            <th>Weight</th>
            <th>Spot</th>
            <th>Points</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {catches.map((row) => {
            const species = fishById(row.speciesId);
            return (
              <tr key={row.id} className={row.id === heaviest?.id ? "heaviest" : ""}>
                <td className={species ? `rarity-${species.rarity}` : ""}>{species?.name ?? row.speciesId}</td>
                <td>{row.weight.toFixed(1)} lb</td>
                <td>{SPOT_LABELS[row.spot]}</td>
                <td>{row.points}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {catches.length === 0 && <p>Nothing landed yet.</p>}
    </div>
  );
}
