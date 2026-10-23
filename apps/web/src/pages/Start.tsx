import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { authClient } from "../auth-client";
import { FIND_PARAM } from "../field/findLinks";
import { useT } from "../i18n";
import { usePageTitle } from "../pageTitle";
import { warmLake } from "../warmLake";
import { AuthLanguage, useHeadingFocus } from "./authParts";

/** The front door: one big Play, a clear Sign in, and the field log a step aside. */
export function StartPage({ loadLake }: { loadLake: () => Promise<unknown> }) {
  const t = useT();
  const { search } = useLocation();
  usePageTitle(t("Stillwater · A fishing game"));
  const heading = useHeadingFocus();
  const session = authClient.useSession();
  const user = session.data?.user;
  // Signed out, each background refetch (on focus, say) marks the session pending again: once answered, the page stays put.
  const [answered, setAnswered] = useState(false);
  if (!session.isPending && !answered) setAnswered(true);
  useEffect(() => {
    if (user) warmLake(loadLake);
  }, [user, loadLake]);

  // Old links to a search in the book ("/?find=pike") open it in the book.
  if (new URLSearchParams(search).has(FIND_PARAM)) return <Navigate to={`/book${search}`} replace />;

  const settled = answered || !session.isPending;
  const offline = settled && !user && !navigator.onLine;
  // Signed out, Play opens Create account, which goes on to the lake; while the check is out, the lake's own gate waits for it.
  const signedOut = settled && !user && !offline;
  const name = user?.name.trim();

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <AuthLanguage />
        <h1 ref={heading} tabIndex={-1}>
          Stillwater
        </h1>
        <p className="lede">{t("A fishing game. Cast, wait for a bite, reel in a fish.")}</p>
        <Link
          className="auth-cta"
          to={signedOut ? "/register" : "/play"}
          state={signedOut ? { from: "/play" } : undefined}
          aria-describedby={signedOut ? "play-hint" : undefined}
        >
          {t("Play")}
        </Link>
        {user ? (
          <p className="start-note">
            {name ? t("Signed in as {name} ({email}).", { name, email: user.email }) : t("Signed in as {email}.", { email: user.email })}{" "}
            {t("Not you?")}{" "}
            <button type="button" className="text-link" onClick={() => void authClient.signOut()}>
              {t("Sign out")}
            </button>
          </p>
        ) : offline ? (
          <p className="start-note">{t("You're offline. The lake needs a connection, but your field log works without one.")}</p>
        ) : signedOut ? (
          <>
            <p className="field-help" id="play-hint">
              {t("New here? It's free.")}
            </p>
            <p className="start-note">{t("Have an account?")}</p>
            <Link className="auth-cta quiet" to="/login">
              {t("Sign in")}
            </Link>
          </>
        ) : null}
        <p className="foot">
          <Link to="/book">{t("Diary of your real fishing trips")}</Link>
        </p>
      </div>
    </main>
  );
}
