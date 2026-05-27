import { WorkerPoolContextProvider } from "@pierre/diffs/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { HIGHLIGHTER_OPTIONS, WORKER_POOL_OPTIONS } from "./data/worker-pool";
import "./styles.css";

const root = document.getElementById("root");
if (root == null) {
  throw new Error("Root element not found.");
}

createRoot(root).render(
  <StrictMode>
    <WorkerPoolContextProvider
      highlighterOptions={HIGHLIGHTER_OPTIONS}
      poolOptions={WORKER_POOL_OPTIONS}
    >
      <App />
    </WorkerPoolContextProvider>
  </StrictMode>
);
