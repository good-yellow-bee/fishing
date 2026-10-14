// Production builds register /sw.js so the app can be installed and opens offline. Dev skips it:
// a worker caching Vite's unhashed modules would serve stale code between edits.
export function registerServiceWorker(env: { prod: boolean; navigator: Navigator; window: Window } = {
  prod: import.meta.env.PROD,
  navigator,
  window,
}) {
  if (!env.prod || !("serviceWorker" in env.navigator)) return false;
  env.window.addEventListener("load", () => {
    env.navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
  return true;
}
