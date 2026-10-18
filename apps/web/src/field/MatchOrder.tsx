import { useSearchParams } from "react-router-dom";
import { t, useT } from "../i18n";

/** "?order=largest": a list of fish shown largest first, kept in the address so Back from a fish returns to it. */
export const ORDER_PARAM = "order";

/** Whether the page's fish are shown largest first, and a way to switch, in the address. */
export function useLargestOrder(): [boolean, (next: boolean) => void] {
  const [params, setParams] = useSearchParams();
  const largest = params.get(ORDER_PARAM) === "largest";
  const setLargest = (next: boolean) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next) out.set(ORDER_PARAM, "largest");
        else out.delete(ORDER_PARAM);
        return out;
      },
      { replace: true },
    );
  return [largest, setLargest];
}

/** "Newest first" or "Largest first": "which was my biggest pike at Cedar". */
export function MatchOrder({ largest, onChange }: { largest: boolean; onChange: (largest: boolean) => void }) {
  useT();
  return (
    <p className="search-order" role="group" aria-label={t("Order of the matches")}>
      <button type="button" className="text-button" aria-pressed={!largest} onClick={() => onChange(false)}>
        {t("Newest first")}
      </button>
      <button type="button" className="text-button" aria-pressed={largest} onClick={() => onChange(true)}>
        {t("Largest first")}
      </button>
    </p>
  );
}
