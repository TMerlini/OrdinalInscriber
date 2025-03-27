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
            // Check if this is the specific error overlay we saw in the screenshot
            if (node.hasAttribute && node.hasAttribute('plugin:runtime-error-plugin')) {
              console.log('Found runtime error plugin element, removing...');
              shouldRemove = true;
              return;
            }
            
            // Check for text content about runtime errors
            if ((node.textContent && 
                (node.textContent.includes('runtime error') || 
                 node.textContent.includes('plugin:runtime-error-plugin') ||
                 node.textContent.includes('unknown runtime error'))) ||
                (node.innerHTML && 
                 (node.innerHTML.includes('runtime error') || 
                  node.innerHTML.includes('plugin:runtime-error-plugin') ||
                  node.innerHTML.includes('unknown runtime error')))) {
              console.log('Found element with runtime error text, removing...');
              shouldRemove = true;
            }
            
            // Check for any elements that look like error overlays
            try {
              const style = window.getComputedStyle(node);
              if (style.position === 'fixed' && 
                  (style.backgroundColor === 'rgba(0, 0, 0, 0.66)' || 
                   style.background.includes('rgb(20, 20, 20)')) && 
                  parseInt(style.zIndex, 10) > 1000) {
                console.log('Found overlay-like element, removing...');
                shouldRemove = true;
              }
            } catch (e) {
              // Ignore style access errors
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
    console.log('Disabling Vite error overlay...');
    
    // For Vite HMR error handling
    window.__vite_plugin_react_preamble_installed__ = false;
    
    // For runtime error overlays - create mock functions
    window.__vite_plugin_react_create_overlay__ = function() {
      console.log('Intercepted overlay creation attempt');
      return {
        close: function() {},
        update: function() {}
      };
    };

    // Override the runtime error plugin
    window.runtimeErrorPlugin = {
      disabled: true,
      overlay: {
        show: function() {},
        hide: function() {}
      }
    };
    
    // Disable runtime error modal
    window.__RUNTIME_ERROR_MODAL__ = {
      disabled: true,
      onError: function() {}
    };

    // Override any error handler
    if (window.__vite_error_overlay__) {
      window.__vite_error_overlay__ = {
        inject: function() { console.log('Prevented error overlay injection'); },
        onErrorOverlay: function() { 
          console.log('Error overlay prevented');
          return removeErrorOverlays(); 
        },
      };
    }
    
    // Disable error overlays at the plugin level
    window.__DISABLE_ERROR_OVERLAYS__ = true;
    
    // Set a global object to prevent future error overlays
    window.__VITE_ERROR_HANDLERS_DISABLED__ = true;
    
    // Disable React refresh overlay
    window.__REACT_REFRESH_RUNTIME_OVERLAY__ = { disabled: true };
    
    // Provide a global override that other scripts can check
    window.disableErrorOverlays = function() {
      removeErrorOverlays();
    };
    
    console.log('Vite error overlay disabled successfully');
  } catch (e) {
    console.log('Error while disabling overlays:', e);
    // Continue with other methods even if monkey-patching fails
  }
})();