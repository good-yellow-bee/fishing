import { useRef, useState, type ChangeEvent } from "react";
import { FIELD_ARCHIVE_REFUSAL, fieldArchiveDocument, parseFieldArchiveText, type FieldArchive } from "@stillwater/shared";
import { commitFieldArchive } from "./archiveStore";
import { useTackle } from "./gear/TackleState";
import { useLogbook } from "./LogbookState";

const LOADED = "This browser now has the book from that file.";

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
  const { items, replaceTackle } = useTackle();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<FieldArchive | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const onDownload = () => {
    downloadBook(JSON.stringify(fieldArchiveDocument({ book, tackle: items, photos })));
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
    setNotice({ tone: "ok", text: LOADED });
  };

  return (
    <footer className="sheet-foot">
      <p>Sample waters are invented. This book stays in this browser.</p>
      <div className="book-file">
        <button type="button" className="text-button" onClick={onDownload}>
          Download this book
        </button>
        <button type="button" className="text-button" onClick={() => fileRef.current?.click()}>
          Load a book
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            if (!window.confirm("Replace this book with the sample week?")) return;
            setPending(null);
            setNotice(null);
            restoreSample();
          }}
        >
          Restore sample book
        </button>
        <input
          ref={fileRef}
          className="book-file-input"
          type="file"
          accept="application/json,.json"
          tabIndex={-1}
          aria-label="Field log file"
          onChange={(event) => {
            void onFile(event);
          }}
        />
      </div>
      {pending ? (
        <p className="confirm-ask">
          Replace the book in this browser with this file? Spots, trips, catches, weather, tackle checks, and photos
          here will be replaced.{" "}
          <button type="button" className="text-button" onClick={onReplace}>
            Replace
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setPending(null);
            }}
          >
            Keep
          </button>
        </p>
      ) : null}
      {notice ? (
        <p className={notice.tone === "ok" ? "book-note" : "field-error"} role="status">
          {notice.text}
        </p>
      ) : null}
    </footer>
  );
}
