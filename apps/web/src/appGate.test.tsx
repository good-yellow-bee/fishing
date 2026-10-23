// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { authClient } from "./auth-client";

vi.mock("./auth-client", () => ({ authClient: { useSession: vi.fn(), signOut: vi.fn(), signIn: { email: vi.fn() } } }));

let root: Root;
let container: HTMLDivElement;

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

async function open(url: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>,
    );
  });
}

describe("the lake's gate", () => {
  it("says it is checking the sign-in while the answer is out", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({ data: null, isPending: true } as unknown as ReturnType<typeof authClient.useSession>);
    await open("/board?tab=week");
    expect(container.textContent).toContain("Checking your sign-in…");
  });

  it("signed out, sends the player to sign in with the page asked for kept", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<typeof authClient.useSession>);
    await open("/board?tab=week");
    expect(container.querySelector("h1")?.textContent).toBe("Sign in");
    expect(container.textContent).toContain("Sign in to play.");
  });
});
