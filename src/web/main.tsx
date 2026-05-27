import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import "./styles.css";

const root = document.getElementById("root");
document.documentElement.classList.add("dark");
document.documentElement.style.colorScheme = "dark";

if (root == null) {
  throw new Error("Root element not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
