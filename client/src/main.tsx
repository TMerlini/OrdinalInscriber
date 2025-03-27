import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Disable Vite's runtime error overlay
if (import.meta.hot) {
  // This explicitly sets the overlay to false
  // @ts-ignore
  import.meta.hot.data.vitePluginReactErrorOverlay = { overlay: false };
}

// Create a global window property to disable the overlay
// @ts-ignore
window.__vite_plugin_react_preamble_installed__ = false;

createRoot(document.getElementById("root")!).render(<App />);
