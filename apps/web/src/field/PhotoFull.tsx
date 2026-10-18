import { useRef, useState } from "react";
import { t, useT } from "../i18n";

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
export function PhotoFull({ src, alt, name }: { src: string; alt: string; name: string }) {
  useT();
  const dialog = useRef<HTMLDialogElement>(null);
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
      <button type="button" className="photo-open" onClick={() => dialog.current?.showModal()} aria-label={t("Open the photo full size")}>
        <img src={src} alt={alt} />
      </button>
      <dialog
        ref={dialog}
        className="photo-full"
        aria-label={alt}
        onClick={(event) => {
          // A tap on the dark around the photo closes it too.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <img src={src} alt={alt} />
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
