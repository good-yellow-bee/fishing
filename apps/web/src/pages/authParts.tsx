import { useEffect, useRef, useState } from "react";
import { Link, useNavigationType } from "react-router-dom";
import { errorText } from "../api";
import { authClient } from "../auth-client";
import { ChoiceRow } from "../field/ChoiceRow";
import { LANGUAGES } from "../field/ThemeChoice";
import { setLang, t, useLang, useT } from "../i18n";

/** Where a sign-in goes on to: the page the lake's gate was asked for ("/board?tab=week"), if it is one of ours. */
export function safeFrom(state: unknown): string | null {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\") ? from : null;
}

/** The email Sign in instead carries over from Create account. */
export function carriedEmail(state: unknown): string {
  const email = (state as { email?: unknown } | null)?.email;
  return typeof email === "string" ? email : "";
}

type AuthError = { code?: string; status?: number; message?: string };

/** What a refused sign-in or sign-up says, and whether the email already has an account. */
export function authFailure(error: AuthError, fallback: string): { text: string; taken: boolean } {
  if (error.status === 429) return { text: t("Too many tries. Wait 10 seconds, then try again."), taken: false };
  if (error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return { text: t("This email already has an account."), taken: true };
  return { text: error.message ? errorText(error.message) : fallback, taken: false };
}

/** The language row at the top of the start and sign-in cards. */
export function AuthLanguage() {
  const t = useT();
  return <ChoiceRow label={t("Language")} value={useLang()} options={LANGUAGES} onChange={setLang} />;
}

/** After a link (not a reload or Back), the page's heading takes focus, so a screen reader says where it landed. */
export function useHeadingFocus() {
  const heading = useRef<HTMLHeadingElement>(null);
  const how = useNavigationType();
  useEffect(() => {
    if (how !== "POP") heading.current?.focus();
  }, [how]);
  return heading;
}

/**
 * Whether the visit came in already signed in: its first answer, not the one after this page's own sign-in, whose
 * session can arrive before the page has moved on.
 */
export function useCameSignedIn(): boolean {
  const session = authClient.useSession();
  const [came, setCame] = useState<boolean | null>(null);
  if (came === null && !session.isPending) setCame(Boolean(session.data));
  return Boolean(came && session.data);
}

/** Opened while signed in: who, the way on, and a way to change account. */
export function SignedInCard({ to }: { to: string }) {
  const t = useT();
  const { data } = authClient.useSession();
  return (
    <>
      <p className="start-note">{t("You're signed in as {name}.", { name: data?.user.name ?? "" })}</p>
      <Link className="auth-cta" to={to} replace>
        {t("Play")}
      </Link>
      <button type="button" className="auth-cta quiet" onClick={() => void authClient.signOut()}>
        {t("Sign out to use another account")}
      </button>
    </>
  );
}
