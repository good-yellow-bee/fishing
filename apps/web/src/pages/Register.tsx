import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorText } from "../api";
import { authClient } from "../auth-client";
import { useT } from "../i18n";
import { usePageTitle } from "../pageTitle";

export function RegisterPage() {
  const navigate = useNavigate();
  const t = useT();
  usePageTitle(t("Join Stillwater"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ? errorText(result.error.message) : t("Could not register"));
        return;
      }
      await authClient.getSession();
      navigate("/play");
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("Could not register"));
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{t("Join Stillwater")}</h1>
        <p className="lede">{t("A name, an email, a password. Points and fish stay on this profile.")}</p>
        <label htmlFor="name">{t("Display name")}</label>
        <input id="name" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="email">{t("Email")}</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">{t("Password")}</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          aria-describedby="password-hint"
        />
        {/* Said before the first try, not only in the browser's refusal after it. */}
        <p className="field-help" id="password-hint">
          {t("At least 8 characters.")}
        </p>
        <p className="error" role="alert">{error}</p>
        <button type="submit">{t("Create profile")}</button>
        <p className="foot">
          {t("Already an angler?")} <Link to="/login">{t("Sign in")}</Link>
        </p>
      </form>
    </main>
  );
}
