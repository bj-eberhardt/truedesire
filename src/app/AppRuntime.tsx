import "../index.css";
import "../styles/base-ui.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

export function mountApp(rootElement: HTMLElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
