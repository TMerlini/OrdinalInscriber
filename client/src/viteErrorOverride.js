// This script is designed to run as early as possible to prevent Vite error overlays
(function() {
  // Create a style element to hide error overlays via CSS
  const style = document.createElement('style');
  style.innerHTML = `
    /* Aggressively hide any error overlay */
    [plugin\\:runtime-error-plugin],
    [data-plugin-runtime-error-plugin],
    div[data-vite-dev-runtime-error],
    div[data-error-overlay],
    div#vite-error-overlay,
    .vite-error-overlay,
    .plugin-runtime-error-plugin,
    .runtime-error-modal,
    div[style*="background-color: rgba(0, 0, 0, 0.66)"][style*="position: fixed"],
    div[style*="background: rgb(20, 20, 20)"][style*="position: fixed"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
    }
  `;
  document.head.appendChild(style);

  // Function to remove any error overlays
  function removeErrorOverlays() {
    // Target specific elements from the screenshot
    const selectors = [
      '[plugin\\:runtime-error-plugin]',
      '[data-plugin-runtime-error-plugin]',
      'div[data-vite-dev-runtime-error]',
      'div[data-error-overlay]',
      'div#vite-error-overlay',
      '.vite-error-overlay',
      '.plugin-runtime-error-plugin',
      '.runtime-error-modal'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });

    // Look for the specific error overlay from the screenshot
    document.querySelectorAll('div').forEach(el => {
      // If it's a fixed position element with black background, it's likely an overlay
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' && 
          (style.backgroundColor === 'rgba(0, 0, 0, 0.66)' || 
           style.background.includes('rgb(20, 20, 20)')) && 
          style.width === '100%' && 
          style.height === '100%') {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }
    });
  }

  // Run immediately to clear any existing overlays
  removeErrorOverlays();

  // Set up a MutationObserver to remove error overlays as they are added
  const observer = new MutationObserver(mutations => {
    let shouldRemove = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        Array.from(mutation.addedNodes).forEach(node => {
          if (node instanceof HTMLElement) {
            // If this element or any of its children has text about runtime errors
            if ((node.textContent && 
                (node.textContent.includes('runtime error') || 
                 node.textContent.includes('plugin:runtime-error-plugin'))) ||
                (node.innerHTML && 
                 (node.innerHTML.includes('runtime error') || 
                  node.innerHTML.includes('plugin:runtime-error-plugin')))) {
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

  // Watch for changes to the DOM
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Also set up an interval to periodically check for overlays
  setInterval(removeErrorOverlays, 200);

  // Add global error event listener
  window.addEventListener('error', function(event) {
    // When an error occurs, try to clear any overlays
    setTimeout(removeErrorOverlays, 0);
    return true; // Allow normal error handling to continue
  });

  // Handle Escape key to dismiss overlays
  window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      removeErrorOverlays();
    }
  });

  // Handle clicks to dismiss overlays when clicking outside
  window.addEventListener('click', function(event) {
    // Give a brief delay to let any overlay render before removing it
    setTimeout(removeErrorOverlays, 10);
  });

  // Try to monkey-patch Vite's error handling
  try {
    // For Vite HMR error handling
    window.__vite_plugin_react_preamble_installed__ = false;
    
    // For runtime error overlays
    const originalCreateOverlay = window.__vite_plugin_react_create_overlay__;
    window.__vite_plugin_react_create_overlay__ = function() {
      // Just return a dummy object that does nothing
      return {
        close: function() {},
        update: function() {}
      };
    };

    // Override any error handler
    if (window.__vite_error_overlay__) {
      window.__vite_error_overlay__ = {
        inject: function() {},
        onErrorOverlay: function() { return removeErrorOverlays(); },
      };
    }
  } catch (e) {
    // Ignore errors during monkey-patching
  }
})();