import { useState } from "react";
import { t } from "../i18n";
import { downloadFile } from "./download";

/** A data URL ("data:image/jpeg;base64,…") as a file to hand to the share sheet, or null when it isn't one. */
function photoFile(dataUrl: string, name: string): File | null {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[2]!), (char) => char.charCodeAt(0));
  const type = match[1]!;
  return new File([bytes], `${name}.${type.split("/")[1] ?? "jpg"}`, { type });
}

/**
 * An outing or a fish as text for a message: copied when the browser allows it, else saved as a file. On a phone that
 * can share, a Share button beside it opens the share sheet, with the fish's photo when there is one.
 */
export function CopySummary({
  text,
  file,
  photo,
  label,
  copied,
  saved,
}: {
  text: () => string;
  file: string;
  photo?: string | null;
  /** The copy button's words, when the text is not a summary (a packing list). */
  label?: string;
  /** What is said once copied, with `label`. */
  copied?: string;
  /** What is said when it was saved as a file instead, with `label`. */
  saved?: string;
}) {
  const [said, setSaid] = useState("");
  const say = (message: string) => {
    // Emptied first, so a second copy is announced again rather than left as the same words.
    setSaid("");
    setTimeout(() => setSaid(message), 100);
  };
  const copy = async () => {
    const summary = text();
    try {
      await navigator.clipboard.writeText(summary);
      say(copied ?? t("Summary copied."));
    } catch {
      downloadFile(summary, "text/plain;charset=utf-8", file);
      say(saved ?? t("The summary was downloaded instead."));
    }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = async () => {
    const summary = text();
    const picture = photo ? photoFile(photo, file.replace(/\.txt$/, "")) : null;
    const withPhoto = picture && navigator.canShare?.({ files: [picture] }) ? { files: [picture] } : {};
    try {
      await navigator.share({ text: summary, ...withPhoto });
    } catch (error) {
      // Closing the share sheet is not a failure; anything else falls back to copying.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    }
  };
  return (
    <p className="trip-again">
      <button type="button" className="text-button" onClick={() => void copy()}>
        {label ?? t("Copy a summary")}
      </button>{" "}
      {canShare ? (
        <>
          <button type="button" className="text-button" onClick={() => void share()}>
            {t("Share")}
          </button>{" "}
        </>
      ) : null}
      <span role="status">{said}</span>
    </p>
  );
}
