import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cleanNickname, lakeNickname, NICKNAME_MAX } from "@stillwater/shared";
import { authClient } from "../auth-client";
import { t, useT } from "../i18n";
import { usePageTitle } from "../pageTitle";
import { AuthLanguage, authFailure, safeFrom, SignedInCard, useCameSignedIn, useHeadingFocus } from "./authParts";

/** A lake word in the reader's language and four digits ("Czapla 4821"). */
const newNickname = () => lakeNickname(Math.random, (word) => t(word));

export function RegisterPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  useT();
  const session = authClient.useSession();
  usePageTitle(`${t("Create account")} · Stillwater`);
  const heading = useHeadingFocus();
  const cameSignedIn = useCameSignedIn();
  const from = safeFrom(state);
  const [name, setName] = useState(newNickname);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setTaken(false);
    setBusy(true);
    try {
      const result = await authClient.signUp.email({ name: cleanNickname(name) || newNickname(), email, password });
      if (result.error) {
        const failure = authFailure(result.error, t("Could not register"));
        setError(failure.text);
        setTaken(failure.taken);
        setBusy(false);
        return;
      }
      // The lake's gate reads the shared session store, which still says signed out: fill it before going on.
      await session.refetch();
      navigate(from ?? "/play", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? authFailure({ message: err.message }, t("Could not register")).text : t("Could not register"));
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <AuthLanguage />
        <h1 ref={heading} tabIndex={-1}>
          {t("Create account")}
        </h1>
        {cameSignedIn && !busy ? (
          <SignedInCard to={from ?? "/play"} />
        ) : (
          <>
            <p className="lede">{t("Free. Your email is only for signing in; other players see only your nickname.")}</p>
            <p className="auth-switch">
              {t("Have an account?")}{" "}
              <Link to="/login" state={from ? { from } : undefined} replace>
                {t("Sign in")}
              </Link>
            </p>
            <label htmlFor="name">{t("Nickname")}</label>
            <input
              id="name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              // Left empty, it fills itself again rather than leaving the board a blank name.
              onBlur={() => setName(cleanNickname(name) || newNickname())}
              maxLength={NICKNAME_MAX}
              aria-describedby="name-hint"
            />
            <p className="field-help" id="name-hint">
              {t("Other players see this. Don't use your real name.")}
            </p>
            <label htmlFor="email">{t("Email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-describedby="email-hint"
            />
            <p className="field-help" id="email-hint">
              {t("No email? Ask a grown-up to help.")}
            </p>
            <label htmlFor="password">{t("Password")}</label>
            <input
              id="password"
              type={shown ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              aria-describedby="password-hint"
            />
            <button type="button" className="show-password" aria-pressed={shown} onClick={() => setShown(!shown)}>
              {t("Show password")}
            </button>
            {/* Said before the first try, not only in the browser's refusal after it. */}
            <p className="field-help" id="password-hint">
              {t("At least 8 characters.")} {t("Write it down. It can't be reset yet.")}
            </p>
            <p className="error" role="alert">{error}</p>
            {taken && (
              <p className="auth-switch">
                <Link to="/login" state={{ ...(from ? { from } : {}), email }} replace>
                  {t("Sign in instead")}
                </Link>
              </p>
            )}
            <button type="submit" disabled={busy}>
              {busy ? t("Creating your account…") : t("Create account and play")}
            </button>
          </>
        )}
        <p className="foot">
          <Link to="/">{t("Back to start")}</Link>
        </p>
      </form>
    </main>
  );
}
