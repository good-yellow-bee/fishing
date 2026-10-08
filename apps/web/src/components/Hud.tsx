import { useState } from "react";
import { Link } from "react-router-dom";
import {
  anglerLevel,
  LAKE_HOUR_LABELS,
  SKILL_LABELS,
  SKY_BLURB,
  SKY_LABELS,
  type LakeHour,
  type Profile,
  type Sky,
} from "@stillwater/shared";
import { authClient } from "../auth-client";
import { fx } from "../game/fx";

type Props = {
  profile: Profile;
  email: string;
  hour: LakeHour;
  sky: Sky;
};

export function Hud({ profile, email, hour, sky }: Props) {
  const level = anglerLevel(profile.lifetimePoints);
  const [muted, setMuted] = useState(!fx.enabled);
  return (
    <header className="hud" data-points={profile.points} data-strength={profile.strength} data-accuracy={profile.accuracy} data-patience={profile.patience} data-hour={hour} data-sky={sky}>
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
        {/* Blurb in the tooltip only: inline, it wrapped the HUD over the stance chip on laptop widths. */}
        <span className="sky-chip" title={SKY_BLURB[sky]}>
          {SKY_LABELS[sky]}
        </span>
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
        <Link className="hud-link" to="/catches">Field log</Link>
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
