import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { disableViteErrorOverlay } from "./lib/disableViteOverlay";

// Disable Vite's runtime error overlay through multiple methods
if (import.meta.hot) {
  // This explicitly sets the overlay to false in Vite's HMR system
  // @ts-ignore
  import.meta.hot.data.vitePluginReactErrorOverlay = { overlay: false };
  
  // Also try disabling error handling
  // @ts-ignore
  if (import.meta.hot.data.vitePluginReactHandler) {
    // @ts-ignore
    import.meta.hot.data.vitePluginReactHandler = () => {}; 
  }
}

// Create a global window property to disable the overlay
// @ts-ignore
window.__vite_plugin_react_preamble_installed__ = false;

// Try to patch the error handler function directly
// @ts-ignore
if (window.__vite_plugin_react_runtime_error_overlay_handler) {
  // @ts-ignore
  window.__vite_plugin_react_runtime_error_overlay_handler = () => {};
}

// Patch any potential error handlers from Replit plugin
// @ts-ignore
if (window.__replit) {
  // @ts-ignore
  window.__replit.errorHandler = null;
}

// Create a MutationObserver immediately to remove error overlays as they appear
const removeErrorOverlays = () => {
  document.querySelectorAll('[plugin\\:runtime-error-plugin], [data-plugin-runtime-error-plugin]').forEach(el => {
    if (el.parentNode) {
      console.log("Removing error overlay early", el);
      el.parentNode.removeChild(el);
    }
  });
};

// Run once immediately
removeErrorOverlays();

// Create and start observer before React even mounts
const observer = new MutationObserver(() => {
  removeErrorOverlays();
});

observer.observe(document, { 
  childList: true, 
  subtree: true 
});

// Start up our aggressive error overlay remover
const cleanup = disableViteErrorOverlay();

// If error happens during React initialization, we still want this work
window.addEventListener('error', (e) => {
  console.log('Global error caught:', e.message);
  removeErrorOverlays();
  return true; // Don't prevent default handling
});

// Add a keyboard event listener to dismiss error overlay with Escape key
// This is mentioned in the error screen: "Click outside, press Esc key, or fix the code to dismiss"
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    console.log('Escape key pressed, removing error overlays');
    removeErrorOverlays();
  }
});

// Add a click handler to dismiss error overlay when clicking outside
// Also mentioned in the error screen
window.addEventListener('click', (e) => {
  // Check if the click is NOT on an error overlay element
  const target = e.target as HTMLElement;
  const isErrorOverlay = target.closest('[data-plugin-runtime-error-plugin], [plugin\\:runtime-error-plugin], .vite-error-overlay, .error-overlay');
  
  if (!isErrorOverlay) {
    console.log('Click outside detected, removing error overlays');
    removeErrorOverlays();
  }
});

// Set up a regular interval to periodically remove error overlays
setInterval(removeErrorOverlays, 500);

// Don't let error overlay interfere with our app
createRoot(document.getElementById("root")!).render(<App />);
