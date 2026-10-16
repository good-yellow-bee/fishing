import { useState } from "react";
import { t } from "../i18n";
import { downloadFile } from "./download";

/** An outing or a fish as text for a message: copied when the browser allows it, else saved as a file. */
export function CopySummary({ text, file }: { text: () => string; file: string }) {
  const [said, setSaid] = useState("");
  const copy = async () => {
    const summary = text();
    try {
      await navigator.clipboard.writeText(summary);
      setSaid(t("Summary copied."));
    } catch {
      downloadFile(summary, "text/plain;charset=utf-8", file);
      setSaid(t("The summary was downloaded instead."));
    }
  };
  return (
    <p className="trip-again">
      <button type="button" className="text-button" onClick={() => void copy()}>
        {t("Copy a summary")}
      </button>{" "}
      <span role="status">{said}</span>
    </p>
  );
}
