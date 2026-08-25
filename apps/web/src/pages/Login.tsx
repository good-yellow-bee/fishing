import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "../auth-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Could not sign in");
        return;
      }
      await authClient.getSession();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Stillwater</h1>
        <p className="lede">First light on a northern lake. Cast, wait, fight whatever takes the hook.</p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
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
        <button type="submit">Enter the dock</button>
        <p className="foot">
          New here? <Link to="/register">Make a profile</Link>
        </p>
      </form>
    </div>
  );
}
