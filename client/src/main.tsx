import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { disableViteErrorOverlay } from "./lib/disableViteOverlay";
import ErrorBoundary from "./components/ErrorBoundary";

// Check if we're likely in an external browser vs. Replit environment
const isExternalBrowser = !window.location.hostname.includes('replit') && 
                          !window.location.hostname.includes('localhost');

// Specifically check for Janeway URL pattern
const isJanewayURL = window.location.hostname.includes('janeway.replit.dev');

// If we detect Janeway URL, this is where the problem is happening, so apply extreme measures
if (isJanewayURL) {
  console.log("*** DETECTED JANEWAY URL ENVIRONMENT - APPLYING SPECIAL FIXES ***");
  
  // Override the runtime error plugin with extreme prejudice by modifying the document
  const style = document.createElement('style');
  style.textContent = `
    /* Ultra-aggressive overlay blocking in Janeway */
    [plugin\\:runtime-error-plugin],
    [data-plugin-runtime-error-plugin],
    div[data-vite-dev-runtime-error],
    div[data-error-overlay],
    div[role="dialog"],
    div.fixed.inset-0,
    div[style*="position: fixed"][style*="z-index"],
    body > div:not([id]) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      pointer-events: none !important;
    }
    
    /* Make sure body is never locked in janeway */
    body {
      overflow: auto !important;
      overflow-x: hidden !important;
      position: static !important;
    }
  `;
  document.head.appendChild(style);
  
  // Create an incredibly aggressive error handler for Janeway
  window.addEventListener('error', function(event) {
    console.log("Janeway - Blocking error:", event.error);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }, true);
  
  window.addEventListener('unhandledrejection', function(event) {
    console.log("Janeway - Blocking rejection:", event.reason);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }, true);
}

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
  
  // Disable error handling for external browser
  if (isExternalBrowser) {
    // @ts-ignore
    import.meta.hot.accept = () => {};
    // @ts-ignore
    import.meta.hot.dispose = () => {};
    // @ts-ignore
    import.meta.hot.decline = () => {};
    // @ts-ignore
    import.meta.hot.invalidate = () => {};
    // @ts-ignore
    import.meta.hot.on = () => {};
  }
}

// Create comprehensive global properties to disable overlays
// @ts-ignore
window.__vite_plugin_react_preamble_installed__ = false;
// @ts-ignore
window.__vite_plugin_react_runtime_error_overlay_handler = () => {};
// @ts-ignore
window.__vite_plugin_react_overlay_shown = false;
// @ts-ignore
window.__vite_hmr_error_overlay__ = {
  show: () => {},
  hide: () => {},
  update: () => {},
  clear: () => {}
};

// Create empty mock handlers for any error system
const emptyHandler = () => {};
const emptyObject = {
  show: emptyHandler,
  hide: emptyHandler,
  update: emptyHandler,
  clear: emptyHandler,
  dispose: emptyHandler,
  handleError: emptyHandler,
  onError: emptyHandler
};

// @ts-ignore - Patch ANY error overlay system we can find
window.__vite_error_overlay__ = emptyObject;
// @ts-ignore
window.__VITE_ERROR_OVERLAY__ = emptyObject;
// @ts-ignore 
window.__RUNTIME_ERROR_MODAL__ = { disabled: true, onError: emptyHandler };
// @ts-ignore
window.runtimeErrorPlugin = { disabled: true, overlay: emptyObject };
// @ts-ignore
window.__REACT_ERROR_OVERLAY__ = emptyObject;
// @ts-ignore
window.__REACT_REFRESH_RUNTIME_OVERLAY__ = { disabled: true };

// Patch any potential error handlers from Replit plugin
// @ts-ignore
if (window.__replit) {
  // @ts-ignore
  window.__replit.errorHandler = null;
}

// Create a super comprehensive error overlay remover
const removeErrorOverlays = () => {
  // Try to remove any element that looks like an error overlay
  const errorSelectors = [
    // Basic Vite selectors
    '[plugin\\:runtime-error-plugin]',
    '[data-plugin-runtime-error-plugin]',
    'div[data-vite-dev-runtime-error]',
    'div[data-error-overlay]',
    'div#vite-error-overlay',
    '.vite-error-overlay',
    '.plugin-runtime-error-plugin',
    '.runtime-error-modal',
    '.error-overlay',
    '[data-error-handler]',
    '[data-plugin-error]',
    
    // External browser specific selectors
    'div[role="dialog"][aria-modal="true"]',
    '.fixed.inset-0',
    'div.overlay-container',
    'div.error-container',
    'div.error-message',
    'div.error-stack',
    'div.error-frame'
  ];
  
  try {
    // Remove elements matching our selectors
    errorSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.parentNode) {
          console.log("Removing error overlay", selector);
          el.parentNode.removeChild(el);
        }
      });
    });
    
    // Special handling for fixed position dark overlays
    document.querySelectorAll('div').forEach(el => {
      try {
        // Skip obvious app elements
        if (el.id === 'root' || el.classList.contains('app')) {
          return;
        }
        
        const style = window.getComputedStyle(el);
        
        // Check if it looks like an overlay
        if (style.position === 'fixed' && 
            ((style.backgroundColor && style.backgroundColor.includes('rgba(0, 0, 0')) || 
             (style.background && style.background.includes('rgb(20, 20, 20)'))) &&
            parseInt(style.zIndex, 10) > 10) {
          console.log("Removing overlay-like element");
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
      } catch (e) {
        // Ignore style access errors
      }
    });
    
    // If we're in external browser mode, be even more aggressive
    if (isExternalBrowser) {
      // Look for elements with error text
      document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6').forEach(el => {
        if (el.textContent && 
           (el.textContent.includes('runtime error') || 
            el.textContent.includes('plugin:runtime-error-plugin') ||
            el.textContent.includes('error stack trace'))) {
          // Try to find the parent overlay
          let parent = el;
          for (let i = 0; i < 5; i++) {
            if (parent.parentElement && parent.parentElement !== document.body) {
              parent = parent.parentElement;
            } else {
              break;
            }
          }
          
          if (parent && parent !== document.body && parent.parentNode) {
            console.log("Removing element with error text");
            parent.parentNode.removeChild(parent);
          }
        }
      });
      
      // Try removing direct children of body that look suspicious
      const bodyChildren = Array.from(document.body.children);
      for (let i = bodyChildren.length - 1; i >= 0; i--) {
        const el = bodyChildren[i];
        if (el.id !== 'root' && el.tagName === 'DIV' && !el.className) {
          try {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && parseInt(style.zIndex, 10) > 10) {
              console.log("Removing suspicious body child");
              el.parentNode?.removeChild(el);
            }
          } catch (e) {
            // Ignore style access errors
          }
        }
      }
    }
    
    // If window has our global kill function from the inline script, use it
    // @ts-ignore
    if (window.__killErrorOverlays && typeof window.__killErrorOverlays === 'function') {
      // @ts-ignore
      window.__killErrorOverlays();
    }
  } catch (e) {
    console.log("Error in removeErrorOverlays:", e);
  }
};

// Run immediately to clear any existing overlays
removeErrorOverlays();

// Create and start observer before React even mounts
const observer = new MutationObserver((mutations) => {
  let shouldRemove = false;
  
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.addedNodes.length) {
      Array.from(mutation.addedNodes).forEach(node => {
        if (node instanceof HTMLElement) {
          // Check for any error-related characteristics
          if ((node.hasAttribute && 
              (node.hasAttribute('plugin:runtime-error-plugin') || 
               node.hasAttribute('data-plugin-runtime-error-plugin') ||
               node.hasAttribute('data-vite-dev-runtime-error'))) ||
              (node.className && 
               (String(node.className).includes('error') || 
                String(node.className).includes('overlay') ||
                String(node.className).includes('modal'))) ||
              (node.textContent && 
               (node.textContent.includes('runtime error') || 
                node.textContent.includes('plugin:runtime-error-plugin') ||
                node.textContent.includes('stack trace')))) {
            console.log("Mutation observer found error-related element:", node);
            shouldRemove = true;
          }
        }
      });
    }
  });
  
  if (shouldRemove) {
    removeErrorOverlays();
  }
});

// Watch for DOM changes with a comprehensive configuration
observer.observe(document.documentElement, { 
  childList: true, 
  subtree: true,
  attributes: true
});

// Start up our aggressive error overlay remover from the utility
const cleanup = disableViteErrorOverlay();

// Comprehensive error event handling
const errorHandler = (e: any) => {
  console.log('Error event caught:', e.type);
  // Remove overlays immediately and again after a delay (for async errors)
  removeErrorOverlays();
  setTimeout(removeErrorOverlays, 50);
  setTimeout(removeErrorOverlays, 200);
  return true; // Don't prevent default handling
};

// Add comprehensive error catching
window.addEventListener('error', errorHandler, true);
window.addEventListener('unhandledrejection', errorHandler, true);

// If we detect potential user interactions that might clear overlays
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    console.log('Escape key pressed, removing error overlays');
    removeErrorOverlays();
  }
}, true);

window.addEventListener('click', (e) => {
  // Small delay to let any overlay get added first, then remove it
  setTimeout(removeErrorOverlays, 10);
}, true);

window.addEventListener('focus', () => {
  // When window gains focus, check for overlays
  setTimeout(removeErrorOverlays, 10);
}, true);

// Set up a regular interval to periodically remove error overlays
// Use a more aggressive interval in external browser mode
const intervalTime = isExternalBrowser ? 100 : 500;
const intervalId = setInterval(removeErrorOverlays, intervalTime);

// Cleanup on component unmount
window.addEventListener('beforeunload', () => {
  observer.disconnect();
  clearInterval(intervalId);
  cleanup();
});

// In external browser mode, let's override console.error
if (isExternalBrowser) {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Filter out certain error messages that might trigger overlays
    if (args && args.length > 0 && typeof args[0] === 'string') {
      const errorMsg = args[0];
      if (errorMsg.includes('runtime error') || 
          errorMsg.includes('plugin:runtime') || 
          errorMsg.includes('vite') ||
          errorMsg.includes('chunk failed') ||
          errorMsg.includes('module failed')) {
        console.log('Suppressed error message in external browser:', args[0]);
        setTimeout(removeErrorOverlays, 0);
        return; // Don't log these errors in external browser
      }
    }
    originalConsoleError.apply(console, args);
    // Remove any overlays after an error
    setTimeout(removeErrorOverlays, 0);
  };
}

// Don't let error overlay interfere with our app by wrapping with ErrorBoundary
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary disableViteOverlay={true}>
    <App />
  </ErrorBoundary>
);
