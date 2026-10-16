import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation, useNavigationType } from "react-router-dom";
import { useLang, useT } from "../i18n";
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

export function FieldShell({ children }: { children: ReactNode }) {
  const t = useT();
  const lang = useLang();
  const theme = useFieldTheme();
  const { pathname } = useLocation();
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
  const lastPath = useRef(pathname);
  useLayoutEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (how !== "POP") window.scrollTo(0, 0);
  }, [pathname, how]);

  // After a link, the new page's heading takes focus, so a screen reader reads where it landed
  // and the keyboard carries on from the top of the page. A page can name another place with
  // data-focus-target; a field the page focused itself is left alone.
  const lastFocused = useRef(pathname);
  useEffect(() => {
    if (lastFocused.current === pathname) return;
    lastFocused.current = pathname;
    if (how === "POP") return;
    const main = document.querySelector<HTMLElement>(".field-main");
    const active = document.activeElement;
    if (!main || (active && main.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))) return;
    const heading = main.querySelector<HTMLElement>("[data-focus-target]") ?? main.querySelector<HTMLElement>("h1") ?? main;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [pathname, how]);

  return (
    <div className="field" data-theme={theme === "device" ? undefined : theme}>
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
        <main className="field-main">{children}</main>
        <SavedNote />
        <UndoBar />
      </div>
      <nav className="field-tab" aria-label={t("Log")}>
        <FieldLinks />
      </nav>
    </div>
  );
}
