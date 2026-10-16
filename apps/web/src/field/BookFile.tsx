import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { FIELD_ARCHIVE_REFUSAL, catchesNewestFirst, fieldArchiveDocument, parseFieldArchiveText, type FieldArchive, type Logbook } from "@stillwater/shared";
import { commitFieldArchive } from "./archiveStore";
import { catchesCsv } from "./catchCsv";
import { clearCopiedAt, copyNudge, ownCatches, readCopiedAt, saveCopiedAt } from "./bookCopy";
import { forgetUnreadableBook, readUnreadableBook } from "./storage";
import { forgetUnreadableTackle, readUnreadableTackle } from "./gear/storage";
import { useTackle } from "./gear/TackleState";
import { fishCountLabel, formatCatchDay, messageText } from "./format";
import { useLogbook } from "./LogbookState";
import { downloadFile } from "./download";
import { t, useT } from "../i18n";
import { homeScreenTip, installApp, useInstallOffer } from "../installPrompt";

/** When a book's newest fish came in, or "" for a book with none. */
function newestAt(book: Logbook): string {
  return catchesNewestFirst(book)[0]?.caughtAt ?? "";
}

/** "12 fish, newest Oct 13", or "no fish". */
function bookSummary(book: Logbook): string {
  const newest = newestAt(book);
  return newest ? t("{fish}, newest {day}", { fish: fishCountLabel(book.catches.length), day: formatCatchDay(newest) }) : t("no fish");
}

/** A stored copy that could not be read: offered as a file, or forgotten on the angler's word. */
function SetAside(props: { text: string; download: string; ask: string; forget: string; raw: string; file: string; onForget: () => void }) {
  return (
    <div className="copy-nudge">
      <p>{props.text}</p>
      <div className="book-file">
        <button type="button" className="text-button" onClick={() => downloadFile(props.raw, "application/json", props.file)}>
          {props.download}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            if (window.confirm(props.ask)) props.onForget();
          }}
        >
          {props.forget}
        </button>
      </div>
    </div>
  );
}

export function BookFile() {
  const { book, storedBook, photos, replaceBook, restoreSample } = useLogbook();
  useT();
  const { items, replaceTackle } = useTackle();
  const fileRef = useRef<HTMLInputElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const askId = useId();
  const [pending, setPending] = useState<FieldArchive | null>(null);
  // A picked file waits on a question: it takes focus on the safe answer, as the delete question does.
  useEffect(() => {
    if (pending) keepButton.current?.focus();
  }, [pending]);
  const keepBook = () => {
    setPending(null);
    loadButton.current?.focus();
  };
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const own = ownCatches(book);
  const [copiedAt, setCopiedAt] = useState(readCopiedAt);
  const nudge = copyNudge(own, copiedAt);
  const canInstall = useInstallOffer();
  const [tip] = useState(() => homeScreenTip());
  const [setAside, setSetAside] = useState(readUnreadableBook);
  const [tackleAside, setTackleAside] = useState(readUnreadableTackle);
  // What a loaded file replaced, while nothing has changed since: the load can be taken back.
  const [beforeLoad, setBeforeLoad] = useState<{ archive: FieldArchive; loaded: FieldArchive; copiedAt: number | null } | null>(null);
  const canUndoLoad = beforeLoad !== null && storedBook === beforeLoad.loaded.book && items === beforeLoad.loaded.tackle;

  const onDownload = () => {
    // The stored book, not the one on screen: a sample week saved in Polish would stay Polish after loading in English.
    downloadFile(JSON.stringify(fieldArchiveDocument({ book: storedBook, tackle: items, photos })), "application/json", "stillwater-field-log.json");
    saveCopiedAt(own);
    setCopiedAt(own);
    setNotice({ tone: "ok", text: t("A copy of this book was downloaded.") });
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
    setBeforeLoad({ archive: { book: storedBook, tackle: items, photos }, loaded: pending, copiedAt });
    replaceBook(pending.book, pending.photos);
    replaceTackle(pending.tackle);
    // The file is itself a copy of the book now in this browser, so the reminder counts from it.
    const loaded = ownCatches(pending.book);
    saveCopiedAt(loaded);
    setCopiedAt(loaded);
    setPending(null);
    setNotice({ tone: "ok", text: t("This browser now has the book from that file.") });
    loadButton.current?.focus();
  };

  const onUndoLoad = () => {
    if (!beforeLoad) return;
    const saved = commitFieldArchive(beforeLoad.archive);
    if (!saved.ok) {
      setNotice({ tone: "bad", text: saved.message });
      return;
    }
    replaceBook(beforeLoad.archive.book, beforeLoad.archive.photos);
    replaceTackle(beforeLoad.archive.tackle);
    if (beforeLoad.copiedAt === null) clearCopiedAt();
    else saveCopiedAt(beforeLoad.copiedAt);
    setCopiedAt(beforeLoad.copiedAt);
    setBeforeLoad(null);
    setNotice({ tone: "ok", text: t("The book from before the file is back.") });
    loadButton.current?.focus();
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
      {setAside ? (
        <SetAside
          text={t("An earlier book in this browser could not be read, so it was set aside instead of being lost.")}
          download={t("Download the set-aside book")}
          ask={t("Forget the set-aside book for good?")}
          forget={t("Forget it")}
          raw={setAside}
          file="stillwater-field-log-set-aside.json"
          onForget={() => {
            forgetUnreadableBook();
            setSetAside(null);
          }}
        />
      ) : null}
      {tackleAside ? (
        <SetAside
          text={t("Earlier tackle lists in this browser could not be read, so they were set aside instead of being lost.")}
          download={t("Download the set-aside lists")}
          ask={t("Forget the set-aside lists for good?")}
          forget={t("Forget them")}
          raw={tackleAside}
          file="stillwater-tackle-set-aside.json"
          onForget={() => {
            forgetUnreadableTackle();
            setTackleAside(null);
          }}
        />
      ) : null}
      {tip && own > 0 ? <p className="copy-nudge">{t("To keep the app and its book on this device, tap Share, then Add to Home Screen.")}</p> : null}
      <div className="book-file">
        <button type="button" className="text-button" onClick={onDownload}>
          {t("Download this book")}
        </button>
        {book.catches.length > 0 ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              downloadFile(catchesCsv(book), "text/csv;charset=utf-8", "stillwater-catches.csv");
              setNotice({ tone: "ok", text: t("The catches were downloaded as a spreadsheet.") });
            }}
          >
            {t("Download catches as a spreadsheet")}
          </button>
        ) : null}
        <button ref={loadButton} type="button" className="text-button" onClick={() => fileRef.current?.click()}>
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
            clearCopiedAt();
            setCopiedAt(null);
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
        <p
          className="confirm-ask"
          role="alertdialog"
          aria-labelledby={askId}
          onKeyDown={(event) => {
            if (event.key === "Escape") keepBook();
          }}
        >
          <span id={askId}>
            {t(
              "Replace the book in this browser with this file? Spots, trips, catches, weather, tackle checks, and photos here will be replaced.",
            )}{" "}
            {/* What each side holds, so an older copy doesn't quietly drop the fish logged since. */}
            {t("This browser: {here}. The file: {there}.", { here: bookSummary(storedBook), there: bookSummary(pending.book) })}
            {newestAt(pending.book) < newestAt(storedBook) ? ` ${t("Fish logged here after the file's newest would be lost.")}` : ""}
          </span>{" "}
          <button type="button" className="text-button" onClick={onReplace}>
            {t("Replace")}
          </button>
          <button ref={keepButton} type="button" className="text-button" onClick={keepBook}>
            {t("Keep")}
          </button>
        </p>
      ) : null}
      {notice ? (
        <p className={notice.tone === "ok" ? "book-note" : "field-error"} role="status">
          {messageText(notice.text)}
          {notice.tone === "ok" && canUndoLoad ? (
            <>
              {" "}
              <button type="button" className="text-button" onClick={onUndoLoad}>
                {t("Undo")}
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </footer>
  );
}
