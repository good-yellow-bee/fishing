import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fishById } from "@stillwater/shared";
import { getMe, type Me } from "../api";

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

  return (
    <div className="log-page">
      <p>
        <Link to="/">Back to the dock</Link>
      </p>
      <h1>{me.profile.displayName}&rsquo;s catch log</h1>
      <p>
        {me.profile.lifetimePoints} lifetime points · {me.catches.length} recent fish
      </p>
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
          {me.catches.map((row) => (
            <tr key={row.id}>
              <td>{fishById(row.speciesId)?.name ?? row.speciesId}</td>
              <td>{row.weight.toFixed(1)} lb</td>
              <td>{row.spot}</td>
              <td>{row.points}</td>
              <td>{new Date(row.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {me.catches.length === 0 && <p>Nothing landed yet.</p>}
    </div>
  );
}
