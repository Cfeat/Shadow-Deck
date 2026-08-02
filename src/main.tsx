import React from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "./i18n";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(
  <LanguageProvider>
    <App />
  </LanguageProvider>,
);
