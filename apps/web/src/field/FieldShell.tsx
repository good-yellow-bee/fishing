import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { useLang, useT } from "../i18n";
import { focusPageHeading } from "./pageFocus";
import { SavedNote } from "./SavedNote";
import { UndoBar } from "./UndoBar";
import { useFieldTheme } from "./fieldTheme";

function FishMark() {
  return (
    <svg className="fish-mark" viewBox="0 0 64 32" aria-hidden="true">
      <path
        d="M6 16c7-7 16-9 28-8 7 .6 12 3.2 16 7.2-4.2 3.6-9.2 6.2-16 7.2C22 24 13 22 6 16z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M50 16.2 62 8.5v15.2z" fill="currentColor" />
      <circle cx="20" cy="14.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

function FieldLinks() {
  const t = useT();
  return (
    <>
      <NavLink to="/" end>
        {t("Home")}
      </NavLink>
      <NavLink to="/catches">{t("Catches")}</NavLink>
      <NavLink to="/spots">{t("Spots")}</NavLink>
      <NavLink to="/map">{t("Map")}</NavLink>
      <NavLink to="/trips">{t("Trips")}</NavLink>
      <NavLink to="/gear">{t("Gear")}</NavLink>
      <NavLink to="/bests">{t("Bests")}</NavLink>
    </>
  );
}

/** The page shown, and the one under it in history when known (after a link; not after Back or Forward). */
let shownPage = "";
let pageBelow: string | null = null;
/** The page this visit showed at each history entry, by the router's number for it (idx): known after Back too. */
const pagesAt = new Map<number, string>();
function historyIdx(): number | null {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : null;
}
/** The page a Back from here lands on, when this visit has shown it there; null when it can't be known. */
export function pageBefore(): string | null {
  const idx = historyIdx();
  return idx === null ? pageBelow : (pagesAt.get(idx - 1) ?? null);
}

/** Whether this visit has gone from one page to another yet: a Back can only come after one. */
let movedInApp = false;
export function hasMovedInApp(): boolean {
  return movedInApp;
}

/**
 * Whether a Back from here stays in the app: the router numbers its history entries (idx), so a form opened first and
 * then left and come back to still knows nothing of ours is under it, and a reload still knows something is. Without
 * the number (a memory router) it falls back on whether this visit has moved yet.
 */
export function canGoBack(): boolean {
  const idx = historyIdx();
  return idx !== null ? idx > 0 : movedInApp;
}

/** Where a Back about to be taken goes on to, in the place of the page it reaches (one a delete just took). */
let replaceOnBack: string | null = null;
export function replaceAfterBack(to: string) {
  replaceOnBack = to;
}

export function FieldShell({ children }: { children: ReactNode }) {
  const t = useT();
  const lang = useLang();
  const theme = useFieldTheme();
  const { pathname, key, search } = useLocation();
  useEffect(() => {
    // Each page's tab and history entry carries its own heading ("Northern pike · Stillwater"); home keeps the
    // app's name. The heading can change after the page has drawn (a book loading, the language switching).
    const main = document.querySelector<HTMLElement>(".field-main");
    const name = t("Stillwater · Field log");
    const update = () => {
      // A page can name its tab apart from its heading (data-title), so an edit form or one fish of many is told apart.
      const named = main?.querySelector("[data-title]")?.getAttribute("data-title") ?? main?.querySelector("h1")?.textContent ?? "";
      const heading = pathname === "/" ? "" : named.trim();
      const next = heading ? `${heading} · Stillwater` : name;
      if (document.title !== next) document.title = next;
    };
    update();
    if (!main) return;
    const watch = new MutationObserver(update);
    watch.observe(main, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [t, lang, pathname]);
  // Leaving the field log for the game, the tab goes back to the app's own name.
  useEffect(
    () => () => {
      document.title = "Stillwater";
    },
    [],
  );

  // A link to another page opens at its top; Back and Forward keep where the browser left it.
  const how = useNavigationType();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (!replaceOnBack) return;
    const to = replaceOnBack;
    replaceOnBack = null;
    if (how === "POP") navigate(to, { replace: true });
  }, [key, how, navigate]);
  useLayoutEffect(() => {
    // A link puts the page shown under the new one; a replace keeps what was under; Back and Forward lose track.
    if (how === "PUSH") pageBelow = shownPage || null;
    else if (how === "POP") pageBelow = null;
    shownPage = pathname + search;
    // A link drops the entries it cut off ahead of it; each entry then holds the page last shown there.
    const idx = historyIdx();
    if (idx !== null) {
      if (how === "PUSH") for (const at of [...pagesAt.keys()]) if (at > idx) pagesAt.delete(at);
      pagesAt.set(idx, shownPage);
    }
  }, [key, how, pathname, search]);
  const lastPath = useRef(pathname);
  useLayoutEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    movedInApp = true;
    if (how !== "POP") window.scrollTo(0, 0);
  }, [pathname, how]);

  // After a link, the new page's heading takes focus, so a screen reader reads where it landed
  // and the keyboard carries on from the top of the page. A page can name another place with
  // data-focus-target; a field the page focused itself is left alone.
  const lastFocused = useRef(pathname);
  useEffect(() => {
    if (lastFocused.current === pathname) return;
    lastFocused.current = pathname;
    const main = document.querySelector<HTMLElement>(".field-main");
    const active = document.activeElement;
    // Back and Forward leave focus where a page put it (a search's box); what held it went with the old page, so
    // otherwise it would fall to the document and the keyboard would start again from the top of the app.
    if (how === "POP" && main && active && active !== main && main.contains(active)) return;
    if (!main || (active && main.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
    focusPageHeading({ preventScroll: true });
  }, [pathname, how]);

  return (
    <div className="field" data-theme={theme === "device" ? undefined : theme}>
      {/* The first stop for the keyboard: past the logo and the seven links, straight to the page. */}
      <a
        className="skip-link"
        href="#field-main"
        onClick={(event) => {
          event.preventDefault();
          focusPageHeading();
        }}
      >
        {t("Skip to the page")}
      </a>
      <aside className="field-rail">
        <NavLink to="/" className="field-brand" end>
          <FishMark />
          <span>
            <strong>Stillwater</strong>
            <small>{t("Field log")}</small>
          </span>
        </NavLink>
        <nav className="field-rail-nav" aria-label={t("Log")}>
          <FieldLinks />
        </nav>
        <NavLink to="/catches/new" className="field-primary">
          {t("Log a catch")}
        </NavLink>
      </aside>
      <div className="field-stage">
        <header className="field-mobile-bar">
          <NavLink to="/" className="field-brand" end>
            <FishMark />
            <span>
              <strong>Stillwater</strong>
              <small>{t("Field log")}</small>
            </span>
          </NavLink>
          <NavLink to="/catches/new" className="field-primary">
            {t("Log a catch")}
          </NavLink>
        </header>
        {/* Before the page in reading order: one Shift+Tab from the heading a delete leaves focus on. It sits fixed at the bottom all the same. */}
        <UndoBar />
        <main className="field-main" id="field-main">
          {children}
        </main>
        <SavedNote />
      </div>
      <nav className="field-tab" aria-label={t("Log")}>
        <FieldLinks />
      </nav>
    </div>
  );
}
