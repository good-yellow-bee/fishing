import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "../auth-client";
import { useT } from "../i18n";
import { usePageTitle } from "../pageTitle";
import { AuthLanguage, authFailure, carriedEmail, safeFrom, SignedInCard, useCameSignedIn, useHeadingFocus } from "./authParts";

export function LoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const t = useT();
  const session = authClient.useSession();
  usePageTitle(`${t("Sign in")} · Stillwater`);
  const heading = useHeadingFocus();
  const cameSignedIn = useCameSignedIn();
  const from = safeFrom(state);
  const [email, setEmail] = useState(() => carriedEmail(state));
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(authFailure(result.error, t("Could not sign in")).text);
        setFailed(true);
        setBusy(false);
        return;
      }
      // The lake's gate reads the shared session store, which still says signed out: fill it before going on.
      await session.refetch();
      navigate(from ?? "/play", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? authFailure({ message: err.message }, t("Could not sign in")).text : t("Could not sign in"));
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <AuthLanguage />
        <h1 ref={heading} tabIndex={-1}>
          {t("Sign in")}
        </h1>
        {cameSignedIn && !busy ? (
          <SignedInCard to={from ?? "/play"} />
        ) : (
          <>
            {from && <p className="lede">{t("Sign in to play.")}</p>}
            <p className="auth-switch">
              {t("No account yet?")}{" "}
              <Link to="/register" state={from ? { from } : undefined} replace>
                {t("Create account")}
              </Link>
            </p>
            <label htmlFor="email">{t("Email")}</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="password">{t("Password")}</label>
            <input
              id="password"
              type={shown ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button type="button" className="show-password" aria-pressed={shown} onClick={() => setShown(!shown)}>
              {t("Show password")}
            </button>
            <p className="error" role="alert">{error}</p>
            {failed && <p className="field-help">{t("Forgot your password? It can't be reset yet. You can create a new account.")}</p>}
            <button type="submit" disabled={busy}>
              {busy ? t("Signing in…") : t("Sign in")}
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
