import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root")!;

// In production the route's HTML was prerendered into #root at build time, so
// we hydrate that existing markup rather than throwing it away and rebuilding
// it. In dev (and on any route that was not prerendered) #root is empty, so we
// mount fresh. Hydrating an empty container would log a mismatch warning, hence
// the check.
if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
