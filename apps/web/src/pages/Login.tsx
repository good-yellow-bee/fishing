import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorText } from "../api";
import { authClient } from "../auth-client";
import { useT } from "../i18n";

export function LoginPage() {
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ? errorText(result.error.message) : t("Could not sign in"));
        return;
      }
      await authClient.getSession();
      navigate("/play");
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("Could not sign in"));
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Stillwater</h1>
        <p className="lede">{t("First light on a northern lake. Cast, wait, fight whatever takes the hook.")}</p>
        <label htmlFor="email">{t("Email")}</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">{t("Password")}</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <p className="error">{error}</p>
        <button type="submit">{t("Enter the dock")}</button>
        <p className="foot">
          {t("New here?")} <Link to="/register">{t("Make a profile")}</Link>
        </p>
      </form>
    </main>
  );
}
