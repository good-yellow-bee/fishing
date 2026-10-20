import { GROUNDBAIT_CARRY, GROUNDBAIT_PRICE, shackPrice, SHINER_PRICE, type LakeSeason } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { GROUNDBAIT_CASTS } from "../game/logic";
import { BUCKET_SIZE } from "../game/baitBucket";

type Props = {
  points: number;
  /** From level 17 the shack's prices drop a fifth. */
  lifetimePoints: number;
  /** Handfuls of groundbait in the bag now. */
  handfuls: number;
  /** A live shiner is on the hook already, landed or bought. */
  shinerOn: boolean;
  /** Spare live shiners in the bait bucket. */
  bucket: number;
  busy: boolean;
  onBuy: () => void;
  onBuyShiner: () => void;
  onHookFromBucket: () => void;
  /** The shiner trap by the shack: not set, soaking, ready to lift, or sat too long. */
  trap: "none" | "soaking" | "ready" | "stale";
  /** The trap soaks in winter's cold water: the one down already, or one baited today. */
  trapCold: boolean;
  onSetTrap: () => void;
  onLiftTrap: () => void;
  /** The lake's season now, which sets how long a spare shiner keeps in the bucket. */
  season: LakeSeason | undefined;
};

/** The shack's bait tin: points buy a handful of groundbait, up to what the bag carries, or a live shiner for the hook. */
export function BaitShop({ points, lifetimePoints, handfuls, shinerOn, bucket, busy, onBuy, onBuyShiner, onHookFromBucket, trap, trapCold, onSetTrap, onLiftTrap, season }: Props) {
  useT();
  const full = handfuls >= GROUNDBAIT_CARRY;
  // aria-disabled, as on the skills: a disabled button would drop keyboard focus the moment a purchase starts.
  const groundbaitCost = shackPrice(GROUNDBAIT_PRICE, lifetimePoints);
  const shinerCost = shackPrice(SHINER_PRICE, lifetimePoints);
  const off = busy || full || points < groundbaitCost;
  const bucketFull = bucket >= BUCKET_SIZE;
  const shinerOff = busy || (shinerOn && bucketFull) || points < shinerCost;
  return (
    <section className="bait-shop">
      <div className="panel-heading">
        <span className="eyebrow">{t("Bait tin")}</span>
        <h3>{t("Groundbait and shiners")}</h3>
      </div>
      <div className="upgrade-row">
        <div className="upgrade-skill">
          <button
            type="button"
            aria-disabled={off || undefined}
            aria-describedby="bait-shop-note"
            onClick={() => {
              if (!off) onBuy();
            }}
          >
            {t("A handful ({cost} pts)", { cost: groundbaitCost })}
          </button>
          <p id="bait-shop-note">
            {full
              ? t("Your bag is full: {max} handfuls.", { max: GROUNDBAIT_CARRY })
              : t("Keeps the fish feeding at a bank for {casts} casts. In your bag: {n} of {max}.", { casts: GROUNDBAIT_CASTS, n: handfuls, max: GROUNDBAIT_CARRY })}
          </p>
        </div>
        <div className="upgrade-skill">
          <button
            type="button"
            aria-disabled={shinerOff || undefined}
            aria-describedby="shiner-shop-note"
            onClick={() => {
              if (!shinerOff) onBuyShiner();
            }}
          >
            {t("A live shiner ({cost} pts)", { cost: shinerCost })}
          </button>
          <p id="shiner-shop-note">
            {!shinerOn
              ? t("Goes on your hook for the next cast and draws the hunters at the bank.")
              : bucketFull
                ? t("Your hook and your bait bucket are full.")
                : `${t("A shiner is on your hook, so another goes in your bait bucket, which holds {n} of {max}.", { n: bucket, max: BUCKET_SIZE })} ${
                    season === "winter" ? t("In the cold winter water it keeps five days there.") : season === "summer" ? t("In the summer heat it keeps two days there.") : t("It keeps three days there.")
                  }`}
          </p>
          {!shinerOn && bucket > 0 && (
            <button type="button" aria-disabled={busy || undefined} onClick={() => !busy && onHookFromBucket()}>
              {t("Hook one from your bucket ({n} left)", { n: bucket })}
            </button>
          )}
        </div>
        <div className="upgrade-skill">
          {trap === "none" ? (
            <button type="button" aria-disabled={busy || handfuls === 0 || undefined} aria-describedby="trap-note" onClick={() => !busy && handfuls > 0 && onSetTrap()}>
              {t("Bait the shiner trap (1 handful)")}
            </button>
          ) : trap === "soaking" ? null : (
            <button type="button" aria-disabled={busy || bucketFull || undefined} aria-describedby="trap-note" onClick={() => !busy && !bucketFull && onLiftTrap()}>
              {t("Lift the shiner trap")}
            </button>
          )}
          <p id="trap-note">
            {trap === "none"
              ? trapCold
                ? t("In the cold winter water the shiners move slowly: a handful of groundbait in the trap by the shack draws one in for your bucket, ready after twelve hours.")
                : t("A handful of groundbait in the trap by the shack draws a few shiners in for your bucket, ready after six hours.")
              : trap === "soaking"
                ? trapCold
                  ? t("The shiner trap is soaking in cold water: lift it after twelve hours.")
                  : t("The shiner trap is soaking: lift it after six hours.")
                : bucketFull
                  ? t("Your bait bucket is full: lift the trap once it has room.")
                  : trap === "ready"
                  ? trapCold
                    ? t("A shiner has found the trap.")
                    : t("Shiners have found the trap.")
                  : t("The trap has sat a long while.")}
          </p>
        </div>
      </div>
    </section>
  );
}
