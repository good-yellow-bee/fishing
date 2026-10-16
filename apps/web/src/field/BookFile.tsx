import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { FIELD_ARCHIVE_REFUSAL, catchesNewestFirst, fieldArchiveDocument, mergeFieldArchive, newFishIn, parseFieldArchiveText, type FieldArchive, type Logbook } from "@stillwater/shared";
import { commitFieldArchive } from "./archiveStore";
import { catchesCsv } from "./catchCsv";
import { bookSignature, changedDaysSince, clearCopiedAt, copyNudge, hasSampleWaters, ownCatches, readCopiedAt, readCopyMark, readCopyRecord, restoreCopyRecord, saveCopiedAt } from "./bookCopy";
import { forgetUnreadableBook, readUnreadableBook } from "./storage";
import { forgetUnreadableTackle, readUnreadableTackle } from "./gear/storage";
import { useTackle } from "./gear/TackleState";
import { fishCountLabel, formatCatchDay, messageText } from "./format";
import { useLogbook } from "./LogbookState";
import { forgetDeletedFish, readDeletedFish } from "./deletedFish";
import { cleanYearGoals, readYearGoals, writeYearGoals, type YearGoals } from "./YearGoal";
import { datedName, downloadFile } from "./download";
import { t, useT } from "../i18n";
import { homeScreenTip, installApp, useInstallOffer } from "../installPrompt";

/** When a book's newest fish came in, or "" for a book with none. */
function newestAt(book: Logbook): string {
  return catchesNewestFirst(book)[0]?.caughtAt ?? "";
}

/** Fish in this browser's book that the file doesn't have: what replacing it with the file would drop. */
function lostOnLoad(here: Logbook, file: Logbook): number {
  const kept = new Set(file.catches.map((entry) => entry.id));
  return here.catches.filter((entry) => !kept.has(entry.id)).length;
}

/** The file without the fish deleted in this browser, so adding its new fish doesn't bring them back. */
function withoutDeleted(file: FieldArchive): FieldArchive {
  const deleted = readDeletedFish();
  return { ...file, book: { ...file.book, catches: file.book.catches.filter((entry) => !deleted.has(entry.id)) } };
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
  // The file's goals for the year, or null for a file from before they were kept.
  const [pendingGoals, setPendingGoals] = useState<YearGoals | null>(null);
  // A picked file waits on a question: it takes focus on the safe answer, as the delete question does.
  useEffect(() => {
    if (pending) keepButton.current?.focus();
  }, [pending]);
  const keepBook = () => {
    setPending(null);
    loadButton.current?.focus();
  };
  const [notice, setNotice] = useState<{ tone: "ok" | "bad" | "loaded"; text: string } | null>(null);

  const own = ownCatches(book);
  const [copiedAt, setCopiedAt] = useState(readCopiedAt);
  const [copyMark, setCopyMark] = useState(readCopyMark);
  // What a download would hold; the goals are read fresh whenever the page shows.
  const signature = useMemo(() => bookSignature(storedBook, items, Object.keys(photos), readYearGoals()), [storedBook, items, photos]);
  const nudge = copyNudge(own, copiedAt, changedDaysSince(copyMark, signature));
  const canInstall = useInstallOffer();
  const [tip] = useState(() => homeScreenTip());
  const [setAside, setSetAside] = useState(readUnreadableBook);
  const [tackleAside, setTackleAside] = useState(readUnreadableTackle);
  // What a loaded file replaced, while nothing has changed since: the load can be taken back.
  const [beforeLoad, setBeforeLoad] = useState<{ archive: FieldArchive; loaded: FieldArchive; copiedAt: number | null; copyRecord: string | null; goals: YearGoals } | null>(null);
  const canUndoLoad = beforeLoad !== null && storedBook === beforeLoad.loaded.book && items === beforeLoad.loaded.tackle;

  // The stored book, not the one on screen: a sample week saved in Polish would stay Polish after loading in English.
  // The year's goals ride along, so a new browser keeps them too.
  const archiveText = () => JSON.stringify({ ...fieldArchiveDocument({ book: storedBook, tackle: items, photos }), goals: readYearGoals() });
  /** A copy went out: the reminder counts from it. */
  const markCopied = () => {
    saveCopiedAt(own, bookSignature(storedBook, items, Object.keys(photos), readYearGoals()));
    setCopiedAt(own);
    setCopyMark(readCopyMark());
  };

  const onDownload = () => {
    downloadFile(archiveText(), "application/json", datedName("stillwater-field-log.json"));
    markCopied();
    setNotice({ tone: "ok", text: t("A copy of this book was downloaded.") });
  };

  // On a phone that can hand files to the share sheet: the same copy, to Files, a drive or a message.
  const [shareFile] = useState(() => {
    try {
      const file = new File(["{}"], "stillwater-field-log.json", { type: "application/json" });
      return typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] }) === true;
    } catch {
      return false;
    }
  });
  const onSend = async () => {
    const file = new File([archiveText()], datedName("stillwater-field-log.json"), { type: "application/json" });
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      // Closing the share sheet sends nothing, so it is not a copy.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ tone: "bad", text: t("The copy could not be sent. Download it instead.") });
      return;
    }
    markCopied();
    setNotice({ tone: "ok", text: t("A copy of this book was sent.") });
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
    try {
      const raw = (JSON.parse(text) as { goals?: unknown }).goals;
      setPendingGoals(raw === undefined ? null : cleanYearGoals(raw));
    } catch {
      setPendingGoals(null);
    }
  };

  /** Puts `next` in this browser, where it can be undone; `merged` is for a book that is this one plus the file's new fish, `leftOut` the file's photos that didn't fit. */
  const load = (next: FieldArchive, merged: boolean, leftOut = 0) => {
    const saved = commitFieldArchive(next);
    if (!saved.ok) {
      setPending(null);
      setNotice({ tone: "bad", text: saved.message });
      return;
    }
    const here: FieldArchive = { book: storedBook, tackle: items, photos };
    const goalsHere = readYearGoals();
    setBeforeLoad({ archive: here, loaded: next, copiedAt, copyRecord: readCopyRecord(), goals: goalsHere });
    replaceBook(next.book, next.photos);
    replaceTackle(next.tackle);
    // Replacing takes the file's goals; adding keeps this browser's and fills in the years it has none for.
    // A file with no goals, from a browser that never set one, leaves this browser's alone.
    if (pendingGoals && Object.keys(pendingGoals).length > 0) writeYearGoals(merged ? { ...pendingGoals, ...goalsHere } : pendingGoals);
    // A fish that is in the book again is no longer one deleted here.
    forgetDeletedFish(next.book.catches.map((entry) => entry.id));
    if (!merged) {
      // The file is itself a copy of the book now in this browser, so the reminder counts from it.
      const loaded = ownCatches(next.book);
      saveCopiedAt(loaded, bookSignature(next.book, next.tackle, Object.keys(next.photos), readYearGoals()));
      setCopiedAt(loaded);
      setCopyMark(readCopyMark());
    }
    setPending(null);
    setNotice({
      tone: "loaded",
      text: merged
        ? [
            t("Fish added from the file: {count}.", { count: next.book.catches.length - here.book.catches.length }),
            ...(leftOut > 0 ? [t("Photos left out, so the book still fits this browser: {count}.", { count: leftOut })] : []),
          ].join(" ")
        : t("This browser now has the book from that file."),
    });
    loadButton.current?.focus();
  };
  const onReplace = () => {
    if (pending) load(pending, false);
  };
  /** `withDeleted` takes back the fish deleted here too, when the file still has them. */
  const onAddNew = (withDeleted = false) => {
    if (!pending) return;
    const file = withDeleted ? pending : withoutDeleted(pending);
    const next = mergeFieldArchive({ book: storedBook, tackle: items, photos }, file);
    // The file's photos that didn't fit beside this book's own.
    const leftOut = newFishIn(storedBook, file.book).filter((entry) => file.photos[entry.id] !== undefined && next.photos[entry.id] === undefined).length;
    load(next, true, leftOut);
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
    writeYearGoals(beforeLoad.goals);
    // The copy record as it was, its time and fingerprint included.
    restoreCopyRecord(beforeLoad.copyRecord);
    setCopiedAt(beforeLoad.copiedAt);
    setCopyMark(readCopyMark());
    setBeforeLoad(null);
    setNotice({ tone: "ok", text: t("The book from before the file is back.") });
    loadButton.current?.focus();
  };

  const lost = pending ? lostOnLoad(storedBook, pending.book) : 0;
  const addable = pending ? newFishIn(storedBook, withoutDeleted(pending).book).length : 0;
  const kept = pending ? newFishIn(storedBook, pending.book).length - addable : 0;

  return (
    <footer className="sheet-foot">
      {/* Said only while the sample's invented waters are still in the book. */}
      <p>{hasSampleWaters(storedBook) ? t("Sample waters are invented. This book stays in this browser.") : t("This book stays in this browser.")}</p>
      {nudge ? (
        <p className="copy-nudge">
          {nudge.kind === "never"
            ? t("This book hasn't been downloaded yet. A copy keeps your catches if the browser clears its storage.")
            : nudge.kind === "since"
              ? t("Catches since the last download: {count}. A fresh copy keeps them safe.", { count: nudge.count })
              : t("The last download was {days} days ago, and the book has changed since. A fresh copy keeps it safe.", { days: nudge.days })}
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
        {shareFile ? (
          <button type="button" className="text-button" onClick={() => void onSend()}>
            {t("Send a copy…")}
          </button>
        ) : null}
        {book.catches.length > 0 ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              downloadFile(catchesCsv(book), "text/csv;charset=utf-8", datedName("stillwater-catches.csv"));
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
            if (!restoreSample()) return;
            clearCopiedAt();
            setCopiedAt(null);
            setCopyMark(null);
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
            {lost > 0 ? ` ${t("Fish here that aren't in the file, and would be lost: {count}.", { count: lost })}` : ""}
            {kept > 0 ? ` ${t("Fish deleted in this browser stay out when adding: {count}.", { count: kept })}` : ""}
          </span>{" "}
          <button type="button" className="text-button" onClick={onReplace}>
            {t("Replace")}
          </button>
          {addable > 0 && storedBook.catches.length > 0 ? (
            // Two copies that each gained fish: keep this one and take the file's new ones.
            <button type="button" className="text-button" onClick={() => onAddNew()}>
              {t("Add only the new fish ({count})", { count: addable })}
            </button>
          ) : null}
          {kept > 0 && storedBook.catches.length > 0 ? (
            // A fish deleted by mistake, still in an older copy, can come back without replacing the book.
            <button type="button" className="text-button" onClick={() => onAddNew(true)}>
              {t("Add with the deleted fish too ({count})", { count: addable + kept })}
            </button>
          ) : null}
          <button ref={keepButton} type="button" className="text-button" onClick={keepBook}>
            {t("Keep")}
          </button>
        </p>
      ) : null}
      {/* Always there, so a screen reader hears each new notice as it changes. */}
      <div role="status">
        {notice ? (
          <p className={notice.tone === "bad" ? "field-error" : "book-note"}>
            {messageText(notice.text)}
            {notice.tone === "loaded" && canUndoLoad ? (
              <>
                {" "}
                <button type="button" className="text-button" onClick={onUndoLoad}>
                  {t("Undo")}
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </footer>
  );
}
