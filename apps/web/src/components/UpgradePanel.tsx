import { skillCost, skillUnlock, SKILL_LABELS, nextSkillRank, type SkillId, type Profile } from "@stillwater/shared";

type Props = {
  profile: Profile;
  busy: boolean;
  onBuy: (skill: SkillId) => void;
};

const skills: SkillId[] = ["strength", "accuracy", "patience"];

const SKILL_NOTES: Record<SkillId, string> = {
  strength: "Land heavier species.",
  accuracy: "Wider cast band and longer strike window.",
  patience: "Shorter waits, heavier fish.",
};

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
          const unlock = skillUnlock(profile, skill);
          return (
            <div key={skill} className="upgrade-skill">
              <button type="button" disabled={disabled} onClick={() => onBuy(skill)}>
                {SKILL_LABELS[skill]} {rank}
                {cost ? ` → ${next} (${cost} pts)` : " max"}
              </button>
              <p>{SKILL_NOTES[skill]}</p>
              {unlock && <p className="upgrade-unlock">{unlock}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
