import { useRef, useState, type ChangeEvent } from "react";
import { FIELD_ARCHIVE_REFUSAL, fieldArchiveDocument, parseFieldArchiveText, type FieldArchive } from "@stillwater/shared";
import { commitFieldArchive } from "./archiveStore";
import { copyNudge, ownCatches, readCopiedAt, saveCopiedAt } from "./bookCopy";
import { useTackle } from "./gear/TackleState";
import { messageText } from "./format";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";
import { installApp, useInstallOffer } from "../installPrompt";

function downloadBook(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stillwater-field-log.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function BookFile() {
  const { book, photos, replaceBook, restoreSample } = useLogbook();
  useT();
  const { items, replaceTackle } = useTackle();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<FieldArchive | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const own = ownCatches(book);
  const [copiedAt, setCopiedAt] = useState(readCopiedAt);
  const nudge = copyNudge(own, copiedAt);
  const canInstall = useInstallOffer();

  const onDownload = () => {
    downloadBook(JSON.stringify(fieldArchiveDocument({ book, tackle: items, photos })));
    saveCopiedAt(own);
    setCopiedAt(own);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setPending(null);
      setNotice({ tone: "bad", text: FIELD_ARCHIVE_REFUSAL });
      return;
    }
    const parsed = parseFieldArchiveText(text);
    if (!parsed.ok) {
      setPending(null);
      setNotice({ tone: "bad", text: parsed.message });
      return;
    }
    setNotice(null);
    setPending(parsed.value);
  };

  const onReplace = () => {
    if (!pending) return;
    const saved = commitFieldArchive(pending);
    if (!saved.ok) {
      setPending(null);
      setNotice({ tone: "bad", text: saved.message });
      return;
    }
    replaceBook(pending.book, pending.photos);
    replaceTackle(pending.tackle);
    setPending(null);
    setNotice({ tone: "ok", text: t("This browser now has the book from that file.") });
  };

  return (
    <footer className="sheet-foot">
      <p>{t("Sample waters are invented. This book stays in this browser.")}</p>
      {nudge ? (
        <p className="copy-nudge">
          {nudge.kind === "never"
            ? t("This book hasn't been downloaded yet. A copy keeps your catches if the browser clears its storage.")
            : t("Catches since the last download: {count}. A fresh copy keeps them safe.", { count: nudge.count })}
        </p>
      ) : null}
      <div className="book-file">
        <button type="button" className="text-button" onClick={onDownload}>
          {t("Download this book")}
        </button>
        <button type="button" className="text-button" onClick={() => fileRef.current?.click()}>
          {t("Load a book")}
        </button>
        {canInstall ? (
          <button type="button" className="text-button" onClick={() => void installApp()}>
            {t("Install the app")}
          </button>
        ) : null}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            if (!window.confirm(t("Replace this book with the sample week?"))) return;
            setPending(null);
            setNotice(null);
            restoreSample();
          }}
        >
          {t("Restore sample book")}
        </button>
        <input
          ref={fileRef}
          className="book-file-input"
          type="file"
          accept="application/json,.json"
          tabIndex={-1}
          aria-label={t("Field log file")}
          onChange={(event) => {
            void onFile(event);
          }}
        />
      </div>
      {pending ? (
        <p className="confirm-ask">
          {t(
            "Replace the book in this browser with this file? Spots, trips, catches, weather, tackle checks, and photos here will be replaced.",
          )}{" "}
          <button type="button" className="text-button" onClick={onReplace}>
            {t("Replace")}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setPending(null);
            }}
          >
            {t("Keep")}
          </button>
        </p>
      ) : null}
      {notice ? (
        <p className={notice.tone === "ok" ? "book-note" : "field-error"} role="status">
          {messageText(notice.text)}
        </p>
      ) : null}
    </footer>
  );
}
