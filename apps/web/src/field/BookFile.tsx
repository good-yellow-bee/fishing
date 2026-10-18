import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { FIELD_ARCHIVE_KIND, FIELD_ARCHIVE_REFUSAL, FIELD_ARCHIVE_VERSION, catchesNewestFirst, foldText, fieldArchiveDocument, mergeFieldArchive, newFishIn, parseFieldArchiveText, type CatchPhotoMap, type FieldArchive, type Logbook } from "@stillwater/shared";
import { commitFieldArchive } from "./archiveStore";
import { catchesCsv } from "./catchCsv";
import { bookSignature, changedDaysSince, clearCopiedAt, copyNudge, hasSampleLeft, hasSampleWaters, isSampleCatch, isSampleOnly, isSampleSpot, isSampleTrip, ownCatches, readCopiedAt, readCopyMark, lowerCopiedAt, readCopyRecord, restoreCopyRecord, saveCopiedAt, withoutSample } from "./bookCopy";
import { keepBookStorage } from "./keepStorage";
import { forgetRemovedPhotos, readRemovedPhotos, restoreRemovedPhotos } from "./removedPhotos";
import { forgetUnreadableBook, readUnreadableBook, salvageStored, setAsideCatchIds, unreadableHeldOnly } from "./storage";
import { forgetUnreadableTackle, readUnreadableTackle } from "./gear/storage";
import { useTackle } from "./gear/TackleState";
import { fishCountLabel, formatCatchDay, messageText } from "./format";
import { useLogbook } from "./LogbookState";
import { intoMergedWaters, readMergedWaters } from "./waterMerge";
import { MERGE_PARAM } from "./MergeWater";
import { forgetDeletedFish, readDeletedFish, restoreDeletedFish } from "./deletedFish";
import { noteSnapshots, snapshotsIn } from "./keepCatch";
import { PLAY_LAKE_ID, offPlayLake } from "./playLake";
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
  // The sample week's invented fish are no loss.
  return here.catches.filter((entry) => !kept.has(entry.id) && !isSampleCatch(entry.id)).length;
}

/** This book's waters and outings a file doesn't have, which replacing would drop; the game's lake comes back on its own. */
function placesLostOnLoad(here: Logbook, file: Logbook): number {
  const kept = new Set([...file.spots, ...file.trips].map((each) => each.id));
  return (
    here.spots.filter((spot) => spot.id !== PLAY_LAKE_ID && !kept.has(spot.id) && !isSampleSpot(spot.id)).length +
    here.trips.filter((trip) => offPlayLake(trip) && !kept.has(trip.id) && !isSampleTrip(trip.id)).length
  );
}

/** Outings both books share whose lost or missed count the file has higher: taps made on the other phone. */
function countsIn(here: Logbook, merged: Logbook): number {
  const before = new Map(here.trips.map((trip) => [trip.id, trip]));
  return merged.trips.filter((trip) => {
    const was = before.get(trip.id);
    return was !== undefined && ((trip.lost ?? 0) !== (was.lost ?? 0) || (trip.missed ?? 0) !== (was.missed ?? 0));
  }).length;
}

/** The file without the fish deleted in this browser, so adding its new fish doesn't bring them back. */
function withoutDeleted(file: FieldArchive): FieldArchive {
  const deleted = readDeletedFish();
  return { ...file, book: { ...file.book, catches: file.book.catches.filter((entry) => !deleted.has(entry.id)) } };
}

/** The file without the sample week when this book holds none of it: left here by Replace or "Start my own book", it stays left. */
function withoutSampleFor(file: FieldArchive, here: Logbook): FieldArchive {
  return hasSampleLeft(here) ? file : { ...file, book: withoutSample(file.book) };
}

/** The first few fish by kind and day, then how many more. */
function fishPreview(entries: readonly { species: string; caughtAt: string }[]): string {
  const shown = entries.slice(0, PREVIEW_FISH).map((entry) => `${t(entry.species)} ${formatCatchDay(entry.caughtAt)}`).join(", ");
  return entries.length > PREVIEW_FISH ? t("{list} and {n} more", { list: shown, n: entries.length - PREVIEW_FISH }) : shown;
}
const PREVIEW_FISH = 3;

/** "12 fish, newest Oct 13", or "no fish". */
function bookSummary(book: Logbook): string {
  if (isSampleOnly(book) && book.catches.every((entry) => isSampleCatch(entry.id))) return t("only the sample week");
  const newest = newestAt(book);
  // The sample week's invented fish beside the angler's own aren't counted as theirs.
  const own = book.catches.filter((entry) => !isSampleCatch(entry.id)).length;
  return newest ? t("{fish}, newest {day}", { fish: fishCountLabel(own > 0 ? own : book.catches.length), day: formatCatchDay(newest) }) : t("no fish");
}

/** Where the set-aside book's notice sits, for a note at the top of Home to lead to. */
export const SET_ASIDE_ID = "set-aside-book";

/** The set-aside book in the shape of a downloaded copy, with its photos still kept here: it loads once mended by hand. */
function setAsideFile(raw: string, photos: CatchPhotoMap): string {
  try {
    const book = JSON.parse(raw) as unknown;
    if (typeof book !== "object" || book === null || Array.isArray(book)) return raw;
    const ids = new Set(setAsideCatchIds());
    const kept = Object.fromEntries(Object.entries(photos).filter(([id]) => ids.has(id)));
    return JSON.stringify({ kind: FIELD_ARCHIVE_KIND, version: FIELD_ARCHIVE_VERSION, book, tackle: { items: [] }, photos: kept });
  } catch {
    return raw;
  }
}

/** A stored copy that could not be read: offered as a file, or forgotten on the angler's word. */
function SetAside(props: { id?: string; text: string; warn?: string; download: string; ask: string; forget: string; raw: string | (() => string); file: string; onForget: () => void }) {
  return (
    <div className="copy-nudge" id={props.id} tabIndex={props.id ? -1 : undefined}>
      <p>{props.text}</p>
      {props.warn ? <p className="field-error">{props.warn}</p> : null}
      <div className="book-file">
        <button type="button" className="text-button" onClick={() => downloadFile(typeof props.raw === "string" ? props.raw : props.raw(), "application/json", props.file)}>
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

/** `onSetAsideGone` tells the page the set-aside book was forgotten, so a note pointing at it can go too. */
export function BookFile({ onSetAsideGone }: { onSetAsideGone?: () => void } = {}) {
  const { book, storedBook, photos, replaceBook, restoreSample, undoable } = useLogbook();
  useT();
  const { items, replaceTackle } = useTackle();
  const fileRef = useRef<HTMLInputElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const askId = useId();
  const [pending, setPending] = useState<FieldArchive | null>(null);
  // The file's goals for the year, or null for a file from before they were kept.
  const [pendingGoals, setPendingGoals] = useState<YearGoals | null>(null);
  // The file's list of the game's snapshots, which may make room later.
  const [pendingSnapshots, setPendingSnapshots] = useState<unknown>(null);
  // A picked file waits on a question: it takes focus on the safe answer, as the delete question does.
  useEffect(() => {
    if (pending) keepButton.current?.focus();
  }, [pending]);
  const keepBook = () => {
    setPending(null);
    loadButton.current?.focus();
  };
  // `twins`: waters the file added under a name the book already had, each a tap from merging.
  const [notice, setNotice] = useState<{ tone: "ok" | "bad" | "loaded"; text: string; twins?: { id: string; name: string; into: string }[] } | null>(null);

  const own = ownCatches(book);
  const [copiedAt, setCopiedAt] = useState(readCopiedAt);
  // An undo elsewhere (the sample week taken back) can put the copy record back: read it again with the book.
  useEffect(() => {
    setCopiedAt(readCopiedAt());
    setCopyMark(readCopyMark());
  }, [storedBook]);
  useEffect(() => {
    // Not while a delete can still be undone: the fish it took may come straight back.
    if (copiedAt === null || copiedAt <= own || undoable) return;
    lowerCopiedAt(own);
    setCopiedAt(own);
  }, [copiedAt, own, undoable]);
  const [copyMark, setCopyMark] = useState(readCopyMark);
  // What a download would hold; the goals are read fresh whenever the page shows.
  const signature = useMemo(() => bookSignature(storedBook, items, Object.keys(photos), readYearGoals()), [storedBook, items, photos]);
  const nudge = copyNudge(own, copiedAt, changedDaysSince(copyMark, signature));
  const canInstall = useInstallOffer();
  const [tip] = useState(() => homeScreenTip());
  const [setAside, setSetAside] = useState(readUnreadableBook);
  const [tackleAside, setTackleAside] = useState(readUnreadableTackle);
  // What a loaded file replaced, while nothing has changed since: the load can be taken back.
  const [beforeLoad, setBeforeLoad] = useState<{ archive: FieldArchive; loaded: FieldArchive; copiedAt: number | null; copyRecord: string | null; goals: YearGoals; deleted: string[]; removed: string[] } | null>(null);
  const canUndoLoad = beforeLoad !== null && storedBook === beforeLoad.loaded.book && items === beforeLoad.loaded.tackle;

  // The stored book, not the one on screen: a sample week saved in Polish would stay Polish after loading in English.
  // The year's goals ride along, so a new browser keeps them too.
  // So do the game's snapshots, so a new browser can still clear them to make room.
  const archiveText = () => JSON.stringify({ ...fieldArchiveDocument({ book: storedBook, tackle: items, photos }), goals: readYearGoals(), snapshots: snapshotsIn(photos) });
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
      const raw = JSON.parse(text) as { goals?: unknown; snapshots?: unknown };
      setPendingGoals(raw.goals === undefined ? null : cleanYearGoals(raw.goals));
      setPendingSnapshots(raw.snapshots ?? null);
    } catch {
      setPendingGoals(null);
      setPendingSnapshots(null);
    }
  };

  /** Puts `next` in this browser, where it can be undone; `merged` is for a book that is this one plus the file's new fish, `leftOut` the file's photos that didn't fit. */
  const load = (file: FieldArchive, merged: boolean, leftOut = 0) => {
    // Replacing keeps the set-aside book's photos, which nothing else holds: adding already starts from this browser's.
    const aside = merged ? [] : setAsideCatchIds().filter((id) => photos[id] !== undefined && file.photos[id] === undefined);
    const next = aside.length > 0 ? { ...file, photos: { ...Object.fromEntries(aside.map((id) => [id, photos[id]!])), ...file.photos } } : file;
    const saved = commitFieldArchive(next);
    if (!saved.ok) {
      setPending(null);
      setNotice({ tone: "bad", text: saved.message });
      return;
    }
    // A book of the angler's own now in this browser: ask it to keep the storage, as the first logged fish does.
    if (ownCatches(next.book) > 0) void keepBookStorage();
    const here: FieldArchive = { book: storedBook, tackle: items, photos };
    const goalsHere = readYearGoals();
    setBeforeLoad({ archive: here, loaded: next, copiedAt, copyRecord: readCopyRecord(), goals: goalsHere, deleted: [...readDeletedFish()], removed: [...readRemovedPhotos()] });
    replaceBook(next.book, next.photos);
    replaceTackle(next.tackle);
    noteSnapshots(pendingSnapshots, next.photos);
    // Replacing takes the file's goals; adding keeps this browser's and fills in the years it has none for.
    // A file with no goals, from a browser that never set one, leaves this browser's alone.
    if (pendingGoals && Object.keys(pendingGoals).length > 0) writeYearGoals(merged ? { ...pendingGoals, ...goalsHere } : pendingGoals);
    // A fish, water or outing that is in the book again is no longer one deleted here.
    forgetDeletedFish([...next.book.catches, ...next.book.spots, ...next.book.trips].map((each) => each.id));
    // A photo that came back with a replaced book is the book's again.
    if (!merged) forgetRemovedPhotos(Object.keys(next.photos));
    if (!merged) {
      // The file is itself a copy of the book now in this browser, so the reminder counts from it.
      const loaded = ownCatches(next.book);
      saveCopiedAt(loaded, bookSignature(next.book, next.tackle, Object.keys(next.photos), readYearGoals()));
      setCopiedAt(loaded);
      setCopyMark(readCopyMark());
    }
    setPending(null);
    const counted = merged ? countsIn(here.book, next.book) : 0;
    const namesHere = new Set(here.book.spots.map((spot) => foldText(spot.name)));
    const idsHere = new Set(here.book.spots.map((spot) => spot.id));
    const twins = merged
      ? next.book.spots
          .filter((spot) => !idsHere.has(spot.id) && namesHere.has(foldText(spot.name)))
          .map((spot) => ({ id: spot.id, name: spot.name, into: here.book.spots.find((other) => foldText(other.name) === foldText(spot.name))!.id }))
      : [];
    setNotice({
      tone: "loaded",
      ...(twins.length > 0 ? { twins } : {}),
      text: merged
        ? [
            // Just the waters and outings, or the photos, when the file brought no fish.
            ...(next.book.catches.length > here.book.catches.length ||
            (next.book.spots.length + next.book.trips.length === here.book.spots.length + here.book.trips.length && Object.keys(next.photos).length === Object.keys(here.photos).length && counted === 0)
              ? [t("Fish added from the file: {count}.", { count: next.book.catches.length - here.book.catches.length })]
              : []),
            ...(counted > 0 ? [t("Outings with newer lost and missed counts: {count}.", { count: counted })] : []),
            ...(next.book.spots.length > here.book.spots.length ? [t("Waters added: {count}.", { count: next.book.spots.length - here.book.spots.length })] : []),
            ...(next.book.trips.length > here.book.trips.length ? [t("Outings added: {count}.", { count: next.book.trips.length - here.book.trips.length })] : []),
            ...(Object.keys(next.photos).length > Object.keys(here.photos).length ? [t("Photos added: {count}.", { count: Object.keys(next.photos).length - Object.keys(here.photos).length })] : []),
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
    const trimmed = withDeleted ? withoutSampleFor(pending, storedBook) : withoutDeleted(withoutSampleFor(pending, storedBook));
    // A water merged away here since the file was made: its fish and outings go to the water it joined.
    const file = { ...trimmed, book: intoMergedWaters(trimmed.book, storedBook, readMergedWaters()) };
    const next = mergeFieldArchive({ book: storedBook, tackle: items, photos }, file, readDeletedFish(), readRemovedPhotos());
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
    // The fish deleted before the load are kept out of later merges again.
    restoreDeletedFish(beforeLoad.deleted);
    // So are the photos removed here on purpose.
    restoreRemovedPhotos(beforeLoad.removed);
    setCopiedAt(beforeLoad.copiedAt);
    setCopyMark(readCopyMark());
    setBeforeLoad(null);
    setNotice({ tone: "ok", text: t("The book from before the file is back.") });
    loadButton.current?.focus();
  };

  const lost = pending ? lostOnLoad(storedBook, pending.book) : 0;
  const placesLost = pending ? placesLostOnLoad(storedBook, pending.book) : 0;
  // Anything of this book's own to add to: a new phone with only a water and an outing planned counts too.
  // The sample week's invented ones are nothing to keep: a new phone with only the sample just takes the file.
  const hasBook =
    storedBook.catches.some((entry) => !isSampleCatch(entry.id)) ||
    storedBook.spots.some((spot) => spot.id !== PLAY_LAKE_ID && !isSampleSpot(spot.id)) ||
    storedBook.trips.some((trip) => !isSampleTrip(trip.id));
  // What the file brings this book: the sample week only while this book still has it.
  const fromFile = pending ? withoutSampleFor(pending, storedBook) : null;
  const adds = fromFile ? catchesNewestFirst({ ...fromFile.book, catches: newFishIn(storedBook, withoutDeleted(fromFile).book) }) : [];
  const addable = adds.length;
  const kept = fromFile ? newFishIn(storedBook, fromFile.book).length - addable : 0;
  // The file's waters and outings with no new fish of their own: one added or planned on another device.
  const adding = fromFile && hasBook ? mergeFieldArchive({ book: storedBook, tackle: [], photos: {} }, { ...withoutDeleted(fromFile), book: intoMergedWaters(withoutDeleted(fromFile).book, storedBook, readMergedWaters()), photos: {} }, readDeletedFish()) : null;
  const placesOnly = adding && addable === 0 ? adding.book.spots.length - storedBook.spots.length + adding.book.trips.length - storedBook.trips.length : 0;
  const removedHere = readRemovedPhotos();
  // Photos the file has for fish both books share and this one has none for: taken on the other phone after a swap.
  const photosOnly = pending && hasBook && addable === 0 && placesOnly === 0 ? storedBook.catches.filter((entry) => photos[entry.id] === undefined && pending.photos[entry.id] !== undefined && !removedHere.has(entry.id)).length : 0;
  // Lost and missed taps the other phone made on an outing this book has too.
  const countsOnly = adding && addable === 0 && placesOnly === 0 && photosOnly === 0 ? countsIn(storedBook, adding.book) : 0;

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
      ) : copyMark ? (
        <p className="meta">{t("Last copy: {day}.", { day: formatCatchDay(new Date(copyMark.at).toISOString()) })}</p>
      ) : null}
      {setAside ? (
        <SetAside
          id={SET_ASIDE_ID}
          text={
            salvageStored(setAside)
              ? t("Part of this browser's book could not be read. What could be read was kept, and the whole book was set aside as it was, so nothing is lost.")
              : t("An earlier book in this browser could not be read, so it was set aside instead of being lost.")
          }
          warn={unreadableHeldOnly() ? t("There is no room to keep it in this browser: download it before this page closes.") : undefined}
          download={t("Download the set-aside book")}
          ask={t("Forget the set-aside book for good?")}
          forget={t("Forget it")}
          raw={() => setAsideFile(setAside, photos)}
          file="stillwater-field-log-set-aside.json"
          onForget={() => {
            forgetUnreadableBook();
            setSetAside(null);
            onSetAsideGone?.();
            // The notice leaves with the button tapped: the focus goes on to loading a book.
            loadButton.current?.focus();
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
            loadButton.current?.focus();
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
          <button type="button" className="text-button" onClick={() => {
            // The button goes once the offer is taken: focus waits on the load button beside it.
            loadButton.current?.focus();
            void installApp();
          }}>
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
          aria-hidden="true"
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
            {/* The newest of the fish adding would bring, so an older or a stranger's file shows itself before a tap. */}
            {addable > 0 && hasBook ? ` ${t("New in the file: {fish}.", { fish: fishPreview(adds) })}` : ""}
            {placesLost > 0 ? ` ${t("Waters and outings here that aren't in the file, and would be lost: {count}.", { count: placesLost })}` : ""}
            {kept > 0 && hasBook ? ` ${t("Fish deleted in this browser stay out when adding: {count}.", { count: kept })}` : ""}
            {/* The same file again: nothing to add, so Replace (which can lose fish) isn't the only way out that reads like one. */}
            {hasBook && addable === 0 && placesOnly === 0 && photosOnly === 0 && countsOnly === 0 && kept === 0 ? ` ${t("Nothing in this file is new to this book.")}` : ""}
          </span>{" "}
          {/* Fish or places Replace would lose: a copy of this book first, in one tap, before deciding. */}
          {lost > 0 || placesLost > 0 ? (
            <button type="button" className="text-button" onClick={onDownload}>
              {t("Download this book first")}
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={onReplace}>
            {t("Replace")}
          </button>
          {addable > 0 && hasBook ? (
            // Two copies that each gained fish: keep this one and take the file's new ones.
            <button type="button" className="text-button" onClick={() => onAddNew()}>
              {t("Add only the new fish ({count})", { count: addable })}
            </button>
          ) : placesOnly > 0 ? (
            <button type="button" className="text-button" onClick={() => onAddNew()}>
              {t("Add the new waters and outings ({count})", { count: placesOnly })}
            </button>
          ) : photosOnly > 0 ? (
            <button type="button" className="text-button" onClick={() => onAddNew()}>
              {t("Add the new photos ({count})", { count: photosOnly })}
            </button>
          ) : countsOnly > 0 ? (
            <button type="button" className="text-button" onClick={() => onAddNew()}>
              {t("Add the newer lost and missed counts ({count})", { count: countsOnly })}
            </button>
          ) : null}
          {kept > 0 && hasBook ? (
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
            {/* Two phones that each added the same water: the file's copy opens on its merge box. */}
            {notice.twins?.map((twin) => (
              <span key={twin.id}>
                {" "}
                {t("{name} is now in the book twice.", { name: twin.name })} <Link to={`/spots/${twin.id}?${MERGE_PARAM}=${encodeURIComponent(twin.into)}`}>{t("Merge them")}</Link>
              </span>
            ))}
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
