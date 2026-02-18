import React from "react";
import KoshikiConsolePage from "./pages/KoshikiConsole";
import { GptShell } from "./components/gpt/GptShell";
import { I18nProvider } from "./i18n/useI18n";

export default function App() {
  return (
    <I18nProvider>
      <GptShell />
    </I18nProvider>
  );
}
