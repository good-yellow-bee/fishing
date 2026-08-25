import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "../auth-client";

export function RegisterPage() {
  const navigate = useNavigate();
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
        setError(result.error.message ?? "Could not register");
        return;
      }
      await authClient.getSession();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register");
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Join Stillwater</h1>
        <p className="lede">A name, an email, a password. Points and fish stay on this profile.</p>
        <label htmlFor="name">Display name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <p className="error">{error}</p>
        <button type="submit">Create profile</button>
        <p className="foot">
          Already an angler? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
