import { Link } from "react-router-dom";
import { t, useT } from "../i18n";

/** An address the field log has no page for: an old link or a typo, with the way back to the book. */
export function NotFoundPage() {
  useT();
  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <h1>{t("Page not found")}</h1>
          <p className="lede">{t("Nothing in the book lives at this address.")}</p>
        </div>
      </header>
      <p>
        <Link to="/">{t("Back to the book")}</Link>
      </p>
    </div>
  );
}
