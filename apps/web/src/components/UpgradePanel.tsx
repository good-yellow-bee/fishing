import { skillCost, SKILL_LABELS, nextSkillRank, type SkillId, type Profile } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { skillUnlockText } from "../i18n/content";

type Props = {
  profile: Profile;
  busy: boolean;
  onBuy: (skill: SkillId) => void;
};

const skills: SkillId[] = ["strength", "accuracy", "patience"];

function skillNote(skill: SkillId): string {
  switch (skill) {
    case "strength":
      return t("Land heavier species.");
    case "accuracy":
      return t("Wider cast band and longer strike window.");
    case "patience":
      return t("Shorter waits, heavier fish.");
  }
}

export function UpgradePanel({ profile, busy, onBuy }: Props) {
  useT();
  return (
    <section className="upgrade-panel">
      <div className="panel-heading">
        <span className="eyebrow">{t("Tackle box")}</span>
        <h3>{t("Line & nerve")}</h3>
      </div>
      <div className="upgrade-row">
        {skills.map((skill) => {
          const rank = profile[skill];
          const next = nextSkillRank(rank);
          const cost = next ? skillCost(rank) : null;
          const disabled = busy || !cost || profile.points < cost;
          const unlock = skillUnlockText(profile, skill);
          const noteId = `upgrade-${skill}-note`;
          const unlockId = `upgrade-${skill}-unlock`;
          return (
            <div key={skill} className="upgrade-skill">
              <button
                type="button"
                disabled={disabled}
                aria-describedby={unlock ? `${noteId} ${unlockId}` : noteId}
                onClick={() => onBuy(skill)}
              >
                {t(SKILL_LABELS[skill])} {rank}
                {cost ? t(" → {next} ({cost} pts)", { next: next ?? "", cost }) : t(" max")}
              </button>
              <p id={noteId}>{skillNote(skill)}</p>
              {unlock && (
                <p id={unlockId} className="upgrade-unlock">
                  {unlock}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
