import { useRef } from "react";
import { t, useT } from "../i18n";

/** A fish's photo on its page, opening full size over the page on a tap; Escape or Close puts it away. */
export function PhotoFull({ src, alt }: { src: string; alt: string }) {
  useT();
  const dialog = useRef<HTMLDialogElement>(null);
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
        <form method="dialog">
          <button type="submit" className="field-primary inline">
            {t("Close")}
          </button>
        </form>
      </dialog>
    </figure>
  );
}
