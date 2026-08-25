import type { Fight } from "../useFishingGame";
import { MashChallenge } from "./MashChallenge";
import { SequenceChallenge } from "./SequenceChallenge";
import { SurgeChallenge } from "./SurgeChallenge";
import { TensionChallenge } from "./TensionChallenge";
import { TimingChallenge } from "./TimingChallenge";
import { challengeScale } from "./scale";

type Props = {
  fight: Fight;
  accuracy: number;
  strength: number;
  onSuccess: () => void;
  onFail: (reason: string) => void;
};

export function FightOverlay({ fight, accuracy, strength, onSuccess, onFail }: Props) {
  const scale = challengeScale(fight.species, fight.weight, accuracy, strength);
  const fail = () => onFail(`${fight.species.name} threw the hook.`);

  let body;
  switch (fight.species.challenge) {
    case "mash":
      body = <MashChallenge clicks={scale.mashClicks} ms={scale.mashMs} onSuccess={onSuccess} onFail={fail} />;
      break;
    case "timing":
      body = <TimingChallenge hits={scale.timingHits} zone={scale.timingZone} onSuccess={onSuccess} onFail={fail} />;
      break;
    case "tension":
      body = <TensionChallenge failMs={scale.tensionFailMs} onSuccess={onSuccess} onFail={fail} />;
      break;
    case "sequence":
      body = <SequenceChallenge length={scale.sequenceLen} ms={scale.sequenceMs} onSuccess={onSuccess} onFail={fail} />;
      break;
    default:
      body = (
        <SurgeChallenge
          mashClicks={scale.mashClicks}
          mashMs={scale.mashMs}
          timingHits={scale.timingHits}
          timingZone={scale.timingZone}
          tensionFailMs={scale.tensionFailMs}
          onSuccess={onSuccess}
          onFail={fail}
        />
      );
  }

  return (
    <div className="overlay">
      <div className="challenge">
        <header>
          <h2>{fight.species.name}</h2>
          <span>{fight.weight.toFixed(1)} lb</span>
        </header>
        {fight.underpowered && <p className="warn">This fish is too heavy for your line.</p>}
        {!fight.underpowered && body}
      </div>
    </div>
  );
}
