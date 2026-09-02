import { useState } from "react";
import { Link } from "react-router-dom";
import { anglerLevel, LAKE_HOUR_LABELS, SKILL_LABELS, type LakeHour, type Profile } from "@stillwater/shared";
import { authClient } from "../auth-client";
import { fx } from "../game/fx";

type Props = {
  profile: Profile;
  email: string;
  hour: LakeHour;
};

export function Hud({ profile, email, hour }: Props) {
  const level = anglerLevel(profile.lifetimePoints);
  const [muted, setMuted] = useState(!fx.enabled);
  return (
    <header className="hud" data-points={profile.points} data-strength={profile.strength} data-accuracy={profile.accuracy} data-patience={profile.patience} data-hour={hour}>
      <div className="hud-brand">
        <span className="eyebrow">Northern lake</span>
        <strong>Stillwater</strong>
        <div className="hud-user">
          <span>{profile.displayName}</span>
          <small>{email}</small>
        </div>
      </div>
      <div className="hud-stats">
        <span className="hour-chip">{LAKE_HOUR_LABELS[hour]}</span>
        <span className="level-chip">Level {level}</span>
        <span className="points-chip">{profile.points} points</span>
        <span className="skill-chip">
          <small>{SKILL_LABELS.strength}</small> {profile.strength}
        </span>
        <span className="skill-chip">
          <small>{SKILL_LABELS.accuracy}</small> {profile.accuracy}
        </span>
        <span className="skill-chip">
          <small>{SKILL_LABELS.patience}</small> {profile.patience}
        </span>
        <Link className="hud-link" to="/log">Catch log</Link>
        <Link className="hud-link" to="/board">Board</Link>
        <button
          className="hud-link"
          type="button"
          onClick={() => {
            fx.enabled = !fx.enabled;
            setMuted(!fx.enabled);
          }}
        >
          {muted ? "Sound" : "Mute"}
        </button>
        <button className="hud-link" type="button" onClick={() => authClient.signOut()}>
          Logout
        </button>
      </div>
    </header>
  );
}
