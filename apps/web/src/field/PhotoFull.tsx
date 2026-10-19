import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { t, useT } from "../i18n";

/** Another fish's photo in the same list, to look through full size without leaving this one. */
export type ListPhoto = { id: string; src: string; alt: string; name: string; caption: string; to: string };

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** "Northern pike", "2026-10-10" → "northern-pike-2026-10-10.jpg", read off the photo's own type. */
export function photoFileName(src: string, name: string): string {
  const type = /^data:([^;,]+)/.exec(src)?.[1] ?? "";
  const stem = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${stem || "fish"}.${EXTENSIONS[type] ?? "jpg"}`;
}

/** A fish's photo on its page, opening full size over the page on a tap; Escape or Close puts it away. */
/** `caption` says under the full-size picture what fish it is, as its page heads it. */
/** `photos` are the pictured fish of the list it was opened from, this one among them, to step through in the dialog. */
export function PhotoFull({ src: ownSrc, alt: ownAlt, name: ownName, caption: ownCaption, photos = [], at = -1 }: { src: string; alt: string; name: string; caption?: string; photos?: readonly ListPhoto[]; at?: number }) {
  useT();
  const location = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const stepping = at >= 0 && photos.length > 1;
  const [shown, setShown] = useState(at);
  const other = stepping && shown !== at ? photos[shown] : undefined;
  const src = other?.src ?? ownSrc;
  const alt = other?.alt ?? ownAlt;
  const name = other?.name ?? ownName;
  const caption = other?.caption ?? ownCaption;
  const step = (by: number) => setShown((now) => Math.min(photos.length - 1, Math.max(0, now + by)));
  const fileName = photoFileName(src, name);
  // A phone's share sheet sends the photo on to a chat or the camera roll; a desktop browser saves it.
  const [canShare] = useState(() => {
    try {
      return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([], fileName, { type: "image/jpeg" })] });
    } catch {
      return false;
    }
  });
  const share = async () => {
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], fileName, { type: blob.type });
      if (!navigator.canShare({ files: [file] })) return;
      await navigator.share({ files: [file] });
    } catch {
      // Put away without sending, or the browser declined: the photo stays as it was.
    }
  };
  return (
    <figure className="catch-photo">
      <button
        type="button"
        className="photo-open"
        onClick={() => {
          // Opened again, it starts on this fish's own photo.
          setShown(at);
          dialog.current?.showModal();
        }}
        aria-label={t("Open the photo full size")}
      >
        <img src={ownSrc} alt={ownAlt} />
      </button>
      <dialog
        ref={dialog}
        className="photo-full"
        aria-label={alt}
        onClick={(event) => {
          // A tap on the dark around the photo closes it too.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        onKeyDown={(event) => {
          // The arrow keys step through the list's photos, as the buttons do.
          if (!stepping || event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowLeft") step(-1);
          else if (event.key === "ArrowRight") step(1);
        }}
      >
        <img src={src} alt={alt} />
        {caption ? <p className="photo-full-caption">{caption}</p> : null}
        {stepping ? (
          <div className="photo-full-bar">
            <button type="button" className="text-button" disabled={shown <= 0} onClick={() => step(-1)}>
              {t("Previous photo")}
            </button>
            <span className="meta" aria-live="polite">
              {t("{at} of {count}", { at: shown + 1, count: photos.length })}
            </span>
            <button type="button" className="text-button" disabled={shown >= photos.length - 1} onClick={() => step(1)}>
              {t("Next photo")}
            </button>
            {other ? (
              <Link className="text-button" to={other.to} state={location.state} onClick={() => dialog.current?.close()}>
                {t("Open this fish")}
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="photo-full-bar">
          <a className="text-button" href={src} download={fileName}>
            {t("Save photo")}
          </a>
          {canShare ? (
            <button type="button" className="text-button" onClick={() => void share()}>
              {t("Share")}
            </button>
          ) : null}
          <form method="dialog">
            <button type="submit" className="field-primary inline">
              {t("Close")}
            </button>
          </form>
        </div>
      </dialog>
    </figure>
  );
}
