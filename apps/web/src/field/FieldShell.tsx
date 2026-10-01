import { useEffect, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

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
  return (
    <>
      <NavLink to="/" end>
        Home
      </NavLink>
      <NavLink to="/catches">Catches</NavLink>
      <NavLink to="/spots">Spots</NavLink>
      <NavLink to="/trips">Trips</NavLink>
    </>
  );
}

export function FieldShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.title = "Stillwater · Field log";
  }, []);

  return (
    <div className="field">
      <aside className="field-rail">
        <NavLink to="/" className="field-brand" end>
          <FishMark />
          <span>
            <strong>Stillwater</strong>
            <small>Field log</small>
          </span>
        </NavLink>
        <nav className="field-rail-nav" aria-label="Log">
          <FieldLinks />
        </nav>
        <NavLink to="/catches/new" className="field-primary">
          Log a catch
        </NavLink>
      </aside>
      <div className="field-stage">
        <header className="field-mobile-bar">
          <NavLink to="/" className="field-brand" end>
            <FishMark />
            <span>
              <strong>Stillwater</strong>
              <small>Field log</small>
            </span>
          </NavLink>
          <NavLink to="/catches/new" className="field-primary">
            Log a catch
          </NavLink>
        </header>
        <main className="field-main">{children}</main>
      </div>
      <nav className="field-tab" aria-label="Log">
        <FieldLinks />
      </nav>
    </div>
  );
}
