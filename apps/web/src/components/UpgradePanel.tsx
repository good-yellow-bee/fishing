import { useState } from "react";
import { skillCost, SKILL_LABELS, nextSkillRank, type SkillId, type Profile } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { STRONG_LIFT_STRENGTH } from "../game/fight";
import { PATIENT_DROP_RANK } from "../game/gotAway";
import { CLEAN_DROP_ACCURACY } from "../game/snag";
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
      return t("Land heavier species. From {rank}, one pump lifts a catfish or sturgeon.", { rank: STRONG_LIFT_STRENGTH });
    case "accuracy":
      return t("Wider cast band and longer strike window. From {rank}, a cast into weeds, pads or rocks snags half as often.", { rank: CLEAN_DROP_ACCURACY });
    case "patience":
      return t("Shorter waits, heavier fish. From {rank}, a fish that drops the bait takes again more often.", { rank: PATIENT_DROP_RANK });
  }
}

export function UpgradePanel({ profile, busy, onBuy }: Props) {
  useT();
  // The skill last bought and its rank before, so the status line says the new rank once the purchase lands.
  const [bought, setBought] = useState<{ skill: SkillId; from: number } | null>(null);
  const boughtRank = bought ? profile[bought.skill] : 0;
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
          // aria-disabled, not disabled: a disabled button drops keyboard focus to the page the moment a purchase starts
          // (and stays out of reach once points run short), so a screen reader heard nothing and Tab started over.
          const off = busy || !cost || profile.points < cost;
          const unlock = skillUnlockText(profile, skill);
          const noteId = `upgrade-${skill}-note`;
          const unlockId = `upgrade-${skill}-unlock`;
          return (
            <div key={skill} className="upgrade-skill">
              <button
                type="button"
                aria-disabled={off || undefined}
                aria-describedby={unlock ? `${noteId} ${unlockId}` : noteId}
                onClick={() => {
                  if (off) return;
                  setBought({ skill, from: rank });
                  onBuy(skill);
                }}
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
      <p className="sr-only" role="status">
        {bought && boughtRank > bought.from ? t("{skill} is now {rank}.", { skill: t(SKILL_LABELS[bought.skill]), rank: boughtRank }) : ""}
      </p>
    </section>
  );
}
