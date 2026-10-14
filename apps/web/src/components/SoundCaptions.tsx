import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { useSettings } from "../game/settings";
import { addCaption, CAPTION_MS, CAPTION_TEXT, onSoundCaption, pruneCaptions, type ShownCaption } from "../game/soundCaptions";

/** A small strip of words for the lake's sounds, shown while the Sound captions setting is on. */
export function SoundCaptions() {
  const { soundCaptions } = useSettings();
  const t = useT();
  const [shown, setShown] = useState<ShownCaption[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (!soundCaptions) {
      setShown([]);
      return;
    }
    const off = onSoundCaption((kind) => {
      setShown((list) => addCaption(list, kind, Date.now(), nextId.current++));
    });
    const tick = window.setInterval(() => {
      setShown((list) => (list.length ? pruneCaptions(list, Date.now()) : list));
    }, CAPTION_MS / 4);
    return () => {
      off();
      window.clearInterval(tick);
    };
  }, [soundCaptions]);

  if (!soundCaptions) return null;
  return (
    <ul className="sound-captions" aria-live="polite">
      {shown.map((c) => (
        <li key={c.id}>[{t(CAPTION_TEXT[c.kind])}]</li>
      ))}
    </ul>
  );
}
