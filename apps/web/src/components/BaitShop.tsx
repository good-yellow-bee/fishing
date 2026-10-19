import { GROUNDBAIT_CARRY, GROUNDBAIT_PRICE } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { GROUNDBAIT_CASTS } from "../game/logic";

type Props = {
  points: number;
  /** Handfuls of groundbait in the bag now. */
  handfuls: number;
  busy: boolean;
  onBuy: () => void;
};

/** The shack's bait tin: points buy a handful of groundbait, up to what the bag carries. */
export function BaitShop({ points, handfuls, busy, onBuy }: Props) {
  useT();
  const full = handfuls >= GROUNDBAIT_CARRY;
  // aria-disabled, as on the skills: a disabled button would drop keyboard focus the moment a purchase starts.
  const off = busy || full || points < GROUNDBAIT_PRICE;
  return (
    <section className="bait-shop">
      <div className="panel-heading">
        <span className="eyebrow">{t("Bait tin")}</span>
        <h3>{t("Groundbait")}</h3>
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
            {t("A handful ({cost} pts)", { cost: GROUNDBAIT_PRICE })}
          </button>
          <p id="bait-shop-note">
            {full
              ? t("Your bag is full: {max} handfuls.", { max: GROUNDBAIT_CARRY })
              : t("Keeps the fish feeding at a bank for {casts} casts. In your bag: {n} of {max}.", { casts: GROUNDBAIT_CASTS, n: handfuls, max: GROUNDBAIT_CARRY })}
          </p>
        </div>
      </div>
    </section>
  );
}
