// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "../auth-client";
import { warmLake } from "../warmLake";
import { StartPage } from "./Start";

vi.mock("../auth-client", () => ({ authClient: { useSession: vi.fn(), signOut: vi.fn() } }));
vi.mock("../warmLake", () => ({ warmLake: vi.fn() }));

type Session = ReturnType<typeof authClient.useSession>;
const pending = { data: null, isPending: true } as unknown as Session;
const signedOut = { data: null, isPending: false } as unknown as Session;
const signedIn = { data: { user: { name: "Heron 4821", email: "ana@example.com" } }, isPending: false } as unknown as Session;

let root: Root;
let container: HTMLDivElement;
const loadLake = () => Promise.resolve();

/** Where the app went: the path, search and the state it carried. */
function Landed() {
  const { pathname, search, state } = useLocation();
  return <p data-landed={`${pathname}${search}`} data-from={(state as { from?: string } | null)?.from ?? ""} />;
}

async function open(url = "/") {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<StartPage loadLake={loadLake} />} />
          <Route path="*" element={<Landed />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const link = (name: string) => [...container.querySelectorAll("a")].find((a) => a.textContent === name);
const landed = () => container.querySelector<HTMLElement>("[data-landed]");

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("the start page", () => {
  it("signed out, sends Play to Create account on its way to the lake, and offers Sign in and the book", async () => {
    vi.mocked(authClient.useSession).mockReturnValue(signedOut);
    await open();
    expect(container.querySelector("h1")?.textContent).toBe("Stillwater");
    expect(link("Sign in")?.getAttribute("href")).toBe("/login");
    expect(link("Diary of your real fishing trips")?.getAttribute("href")).toBe("/book");
    expect(container.textContent).toContain("New here? It's free.");
    expect(warmLake).not.toHaveBeenCalled();
    await act(async () => link("Play")!.click());
    expect(landed()?.dataset.landed).toBe("/register");
    expect(landed()?.dataset.from).toBe("/play");
  });

  it("while the sign-in check is out, keeps Play going to the lake and shows nothing under it", async () => {
    vi.mocked(authClient.useSession).mockReturnValue(pending);
    await open();
    expect(link("Play")?.getAttribute("href")).toBe("/play");
    expect(link("Sign in")).toBeUndefined();
    expect(container.textContent).not.toContain("New here?");
  });

  it("keeps the row under Play while a background refetch marks the session pending again", async () => {
    vi.mocked(authClient.useSession).mockReturnValue(signedOut);
    await open();
    vi.mocked(authClient.useSession).mockReturnValue({ data: null, isPending: true, isRefetching: true } as unknown as Session);
    await open();
    expect(link("Sign in")?.getAttribute("href")).toBe("/login");
    expect(link("Play")?.getAttribute("href")).toBe("/register");
  });

  it("signed in, names the account, plays straight away, warms the lake and can sign out", async () => {
    vi.mocked(authClient.useSession).mockReturnValue(signedIn);
    await open();
    expect(container.textContent).toContain("Signed in as Heron 4821 (ana@example.com).");
    expect(link("Play")?.getAttribute("href")).toBe("/play");
    expect(link("Sign in")).toBeUndefined();
    expect(warmLake).toHaveBeenCalledWith(loadLake);
    const signOut = [...container.querySelectorAll("button")].find((button) => button.textContent === "Sign out")!;
    await act(async () => signOut.click());
    expect(authClient.signOut).toHaveBeenCalled();
  });

  it("offline and signed out, says the field log still works", async () => {
    vi.mocked(authClient.useSession).mockReturnValue(signedOut);
    vi.stubGlobal("navigator", { onLine: false });
    await open();
    expect(container.textContent).toContain("You're offline.");
    expect(link("Play")?.getAttribute("href")).toBe("/play");
    expect(link("Sign in")).toBeUndefined();
  });

  it("opens an old link to a search in the book there", async () => {
    vi.mocked(authClient.useSession).mockReturnValue(signedOut);
    await open("/?find=pike&order=largest");
    expect(landed()?.dataset.landed).toBe("/book?find=pike&order=largest");
  });
});
