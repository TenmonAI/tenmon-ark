import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/gpt-base.css";
import App from "./App";
import { installTenmonIDBExportHook } from "./_core/idb_export";

installTenmonIDBExportHook();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
