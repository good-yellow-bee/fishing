import { skillCost, SKILL_LABELS, nextSkillRank, type SkillId, type Profile } from "@stillwater/shared";

type Props = {
  profile: Profile;
  busy: boolean;
  onBuy: (skill: SkillId) => void;
};

const skills: SkillId[] = ["strength", "accuracy", "patience"];

export function UpgradePanel({ profile, busy, onBuy }: Props) {
  return (
    <section className="upgrade-panel">
      <div className="panel-heading">
        <span className="eyebrow">Tackle box</span>
        <h3>Line & nerve</h3>
      </div>
      <div className="upgrade-row">
        {skills.map((skill) => {
          const rank = profile[skill];
          const next = nextSkillRank(rank);
          const cost = next ? skillCost(rank) : null;
          const disabled = busy || !cost || profile.points < cost;
          return (
            <button key={skill} type="button" disabled={disabled} onClick={() => onBuy(skill)}>
              {SKILL_LABELS[skill]} {rank}
              {cost ? ` → ${next} (${cost} pts)` : " max"}
            </button>
          );
        })}
      </div>
    </section>
  );
}
