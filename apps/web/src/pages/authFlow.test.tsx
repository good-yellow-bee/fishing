// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type InitialEntry } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "../auth-client";
import { PL_PAGES } from "../i18n/pl/pages";
import { safeFrom } from "./authParts";
import { LoginPage } from "./Login";
import { RegisterPage } from "./Register";

vi.mock("../auth-client", () => ({
  authClient: { useSession: vi.fn(), signOut: vi.fn(), signIn: { email: vi.fn() }, signUp: { email: vi.fn() } },
}));

type Session = ReturnType<typeof authClient.useSession>;
const refetch = vi.fn(async () => undefined);
const signedOut = () => ({ data: null, isPending: false, refetch }) as unknown as Session;
const signedIn = () => ({ data: { user: { name: "Heron 4821", email: "ana@example.com" } }, isPending: false, refetch }) as unknown as Session;

let root: Root;
let container: HTMLDivElement;

/** The page shown, with a Back button to check where history leads. */
function Shown({ name }: { name: string }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return (
    <p data-shown={name} data-at={pathname + search}>
      <button type="button" data-back onClick={() => navigate(-1)} />
    </p>
  );
}

async function open(entries: InitialEntry[]) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/" element={<Shown name="start" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Shown name="page" />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const shown = () => container.querySelector<HTMLElement>("[data-shown]");
const input = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!;
const link = (name: string) => [...container.querySelectorAll("a")].find((a) => a.textContent === name);

function type(id: string, value: string) {
  const field = input(id);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

async function submit() {
  await act(async () => container.querySelector("form")!.requestSubmit());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(authClient.useSession).mockImplementation(signedOut);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("where a sign-in goes on to", () => {
  it("takes only a page of this site", () => {
    expect(safeFrom({ from: "/board?tab=week" })).toBe("/board?tab=week");
    expect(safeFrom({ from: "//evil.example" })).toBeNull();
    expect(safeFrom({ from: "/\\evil.example" })).toBeNull();
    expect(safeFrom({ from: "https://evil.example" })).toBeNull();
    expect(safeFrom(null)).toBeNull();
  });
});

describe("signing in", () => {
  it("goes back to the page the gate was asked for, in its place, so Back lands on the start page", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null } as never);
    await open(["/", { pathname: "/login", state: { from: "/board?tab=week" } }]);
    expect(container.textContent).toContain("Sign in to play.");
    expect(link("Create account")?.getAttribute("href")).toBe("/register");
    type("email", "ana@example.com");
    type("password", "long-enough-1");
    await submit();
    expect(refetch).toHaveBeenCalled();
    expect(shown()?.dataset.at).toBe("/board?tab=week");
    await act(async () => container.querySelector<HTMLButtonElement>("[data-back]")!.click());
    expect(shown()?.dataset.shown).toBe("start");
  });

  it("after a refused try, says the password can't be reset and offers a new account", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: null, error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" } } as never);
    await open(["/login"]);
    type("email", "ana@example.com");
    type("password", "long-enough-1");
    await submit();
    expect(container.querySelector(".error")?.textContent).toBe("Invalid email or password");
    expect(container.textContent).toContain("Forgot your password? It can't be reset yet.");
    expect(container.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled).toBe(false);
  });

  it("says plainly when there were too many tries", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: null, error: { status: 429, message: "Too many requests. Please try again later." } } as never);
    await open(["/login"]);
    type("email", "ana@example.com");
    type("password", "long-enough-1");
    await submit();
    expect(container.querySelector(".error")?.textContent).toBe("Too many tries. Wait 10 seconds, then try again.");
  });

  it("shows the password on request, as a pressed switch", async () => {
    await open(["/login"]);
    const show = container.querySelector<HTMLButtonElement>(".show-password")!;
    expect(show.type).toBe("button");
    await act(async () => show.click());
    expect(show.getAttribute("aria-pressed")).toBe("true");
    expect(input("password").type).toBe("text");
  });

  it("opened while signed in, says who and offers Play and another account", async () => {
    vi.mocked(authClient.useSession).mockImplementation(signedIn);
    await open(["/login"]);
    expect(container.textContent).toContain("You're signed in as Heron 4821.");
    expect(link("Play")?.getAttribute("href")).toBe("/play");
    expect(container.querySelector("#email")).toBeNull();
  });
});

describe("creating an account", () => {
  it("fills in a lake nickname and fills it again when cleared", async () => {
    await open(["/register"]);
    expect(input("name").value).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    type("name", "   ");
    await act(async () => input("name").dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
    expect(input("name").value).toMatch(/^[A-Z][a-z]+ \d{4}$/);
  });

  it("sends the trimmed nickname and goes on to the lake", async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({ data: {}, error: null } as never);
    await open(["/", { pathname: "/register", state: { from: "/play" } }]);
    type("name", "  Ana  ");
    type("email", "ana@example.com");
    type("password", "long-enough-1");
    type("password-again", "long-enough-1");
    await submit();
    expect(authClient.signUp.email).toHaveBeenCalledWith({ name: "Ana", email: "ana@example.com", password: "long-enough-1" });
    expect(shown()?.dataset.at).toBe("/play");
  });

  it("stops two different passwords before sending, on the second field, until either is changed", async () => {
    await open(["/register"]);
    type("email", "ana@example.com");
    type("password", "long-enough-1");
    type("password-again", "long-enough-2");
    await submit();
    expect(authClient.signUp.email).not.toHaveBeenCalled();
    expect(container.querySelector("#password-again-error")?.textContent).toBe("The two passwords are different.");
    expect(document.activeElement).toBe(input("password-again"));
    expect(input("password-again").getAttribute("aria-describedby")).toBe("password-again-error");
    expect([input("password").value, input("password-again").value]).toEqual(["long-enough-1", "long-enough-2"]);
    expect(container.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled).toBe(false);
    await act(async () => type("password", "long-enough-2"));
    expect(container.querySelector("#password-again-error")).toBeNull();
  });

  it("shows both passwords with one switch", async () => {
    await open(["/register"]);
    const show = container.querySelector<HTMLButtonElement>(".show-password")!;
    await act(async () => show.click());
    expect(show.getAttribute("aria-pressed")).toBe("true");
    expect([input("password").type, input("password-again").type]).toEqual(["text", "text"]);
    expect([input("password").getAttribute("autocomplete"), input("password-again").getAttribute("autocomplete")]).toEqual(["new-password", "new-password"]);
  });

  it("names a taken email and offers to sign in with it", async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({ data: null, error: { status: 422, code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "User already exists. Use another email." } } as never);
    await open(["/register"]);
    type("email", "ana@example.com");
    type("password", "long-enough-1");
    type("password-again", "long-enough-1");
    await submit();
    expect(container.querySelector(".error")?.textContent).toBe("This email already has an account.");
    await act(async () => link("Sign in instead")!.click());
    expect(input("email").value).toBe("ana@example.com");
  });
});

describe("Polish on the sign-in pages", () => {
  it("speaks to any player, not to a man or a woman", () => {
    const keys = ["Sign in to play.", "No account yet?", "Forgot your password? It can't be reset yet. You can create a new account.", "Free. Your email is only for signing in; other players see only your nickname.", "Other players see this. Don't use your real name.", "No email? Ask a grown-up to help.", "Write it down. It can't be reset yet.", "You're signed in as {name}.", "Sign out? To come back you need your email and password.", "Have an account?", "New here? It's free.", "Type the password again", "The two passwords are different."];
    for (const key of keys) {
      const line = PL_PAGES[key];
      expect(line, key).toBeTypeOf("string");
      expect(line as string, key).not.toMatch(/łeś|łaś|Nowy |Nowa |zalogowany|zalogowana/);
    }
  });
});
