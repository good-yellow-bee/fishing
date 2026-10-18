import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { getLang, loadPolish } from "./i18n";
import { registerServiceWorker } from "./serviceWorker";
import { watchInstallOffer } from "./installPrompt";
import "./index.css";
import "./field/field.css";

watchInstallOffer();

// A Polish reader's first paint waits for the Polish book (its own chunk); if it cannot load, the app opens in English.
const book = getLang() === "pl" ? loadPolish().catch(() => {}) : Promise.resolve();
void book.then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  ),
);

registerServiceWorker();
