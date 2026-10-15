import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { registerServiceWorker } from "./serviceWorker";
import { watchInstallOffer } from "./installPrompt";
import "./index.css";
import "./field/field.css";

watchInstallOffer();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

registerServiceWorker();
