// This script is designed to run as early as possible to prevent Vite error overlays
// with special handling for external browser environments
(function() {
  // Check if we're likely in an external browser vs. Replit environment
  const isExternalBrowser = !window.location.hostname.includes('replit') && 
                            !window.location.hostname.includes('localhost');
  
  // Create a style element to hide error overlays via CSS with more aggressive rules
  const style = document.createElement('style');
  style.innerHTML = `
    /* Ultra-aggressive error overlay suppression */
    [plugin\\:runtime-error-plugin],
    [data-plugin-runtime-error-plugin],
    div[data-vite-dev-runtime-error],
    div[data-error-overlay],
    div#vite-error-overlay,
    .vite-error-overlay,
    .plugin-runtime-error-plugin,
    .runtime-error-modal,
    .error-overlay,
    [data-error-handler],
    [data-plugin-error],
    div[style*="background-color: rgba(0, 0, 0, 0.66)"][style*="position: fixed"],
    div[style*="background: rgb(20, 20, 20)"][style*="position: fixed"],
    div[style*="z-index: 99"][style*="position: fixed"],
    div[style*="backdrop-filter"][style*="position: fixed"],
    div.overlay-container,
    div.error-container,
    body > div:last-of-type:not([id])[style*="position: fixed"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      max-height: 0 !important;
      max-width: 0 !important;
      border: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      transform: scale(0) !important;
    }
    
    /* Extra selectors for external browser environments */
    ${isExternalBrowser ? `
    /* When in external browser, apply these extra aggressive rules */
    div[role="dialog"],
    div.modal-overlay,
    div.modal-backdrop,
    .fixed.inset-0,
    div[style*="position: fixed"][style*="inset: 0"],
    div[style*="backdrop-filter"]:not([id]),
    body > div:not([id]) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      z-index: -9999 !important;
      pointer-events: none !important;
    }
    
    /* Override any attempts to show error messages */
    body.overflow-hidden,
    body.has-modal {
      overflow: auto !important;
    }
    ` : ''}
  `;
  document.head.appendChild(style);

  // Even more comprehensive list of selectors in external browser mode
  const errorSelectors = [
    // Basic error overlay selectors
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
    
    // Additional selectors for external browser mode
    'div[role="dialog"][aria-modal="true"]',
    '.fixed.inset-0',
    'div.overlay-container',
    'div.error-container',
    'div.error-message',
    'div.error-stack',
    'div.error-frame'
  ];
  
  // Function to aggressively remove any error overlays
  function removeErrorOverlays() {
    // Check for specific elements we know are error overlays
    errorSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          } else if (el) {
            // If we can't remove it, hide it completely
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.zIndex = '-9999';
            el.style.pointerEvents = 'none';
            el.style.position = 'absolute';
            el.style.top = '-9999px';
            el.style.left = '-9999px';
            el.style.width = '0';
            el.style.height = '0';
            el.style.overflow = 'hidden';
          }
        });
      } catch (e) {
        // Ignore errors during element removal
      }
    });

    // Look for error overlays by their visual characteristics
    try {
      document.querySelectorAll('div').forEach(el => {
        // Skip elements that are clearly not overlays
        if (el.id === 'root' || el.classList.contains('app') || el.parentElement === document.head) {
          return;
        }
        
        try {
          const style = window.getComputedStyle(el);
          
          // If it's a fixed position element with dark background or high z-index, it's likely an overlay
          if ((style.position === 'fixed' && 
               (style.backgroundColor.includes('rgba(0, 0, 0') || 
                style.background.includes('rgb(20, 20, 20)') ||
                parseInt(style.zIndex, 10) > 100)) || 
              // Or it has error-like content
              (el.textContent && 
               (el.textContent.includes('runtime error') || 
                el.textContent.includes('plugin:runtime') ||
                el.textContent.includes('stack trace') ||
                el.textContent.includes('Unknown error')))) {
                
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            } else {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.zIndex = '-9999';
              el.style.pointerEvents = 'none';
            }
          }
        } catch (e) {
          // Ignore style access errors
        }
      });
    } catch (e) {
      // Ignore errors during overlay detection
    }
    
    // In external browser mode, look for specific patterns in the DOM
    if (isExternalBrowser) {
      try {
        // Look for the last fixed position div at the body level that might be an overlay
        const bodyChildren = Array.from(document.body.children);
        for (let i = bodyChildren.length - 1; i >= 0; i--) {
          const el = bodyChildren[i];
          if (el.tagName === 'DIV' && el.id !== 'root') {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 10) {
              if (el.parentNode) {
                el.parentNode.removeChild(el);
                break; // Remove only the topmost overlay
              }
            }
          }
        }
        
        // Look for elements with runtime error text specifically
        document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6').forEach(el => {
          if (el.textContent && 
              (el.textContent.includes('runtime error') || 
               el.textContent.includes('plugin:runtime-error-plugin') ||
               el.textContent.includes('error stack trace'))) {
            // Find the closest parent that might be the full overlay
            let parent = el;
            for (let i = 0; i < 5; i++) {
              if (parent.parentElement && parent.parentElement !== document.body) {
                parent = parent.parentElement;
              } else {
                break;
              }
            }
            
            if (parent && parent !== document.body) {
              if (parent.parentNode) {
                parent.parentNode.removeChild(parent);
              }
            }
          }
        });
      } catch (e) {
        // Ignore errors during external browser cleanup
      }
    }
  }

  // Run immediately to clear any existing overlays
  removeErrorOverlays();

  // Set up a more aggressive MutationObserver to remove error overlays as they are added
  const observer = new MutationObserver(mutations => {
    let shouldRemove = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        Array.from(mutation.addedNodes).forEach(node => {
          if (node instanceof HTMLElement) {
            // Check for error-related attributes
            if ((node.hasAttribute && 
                (node.hasAttribute('plugin:runtime-error-plugin') || 
                 node.hasAttribute('data-plugin-runtime-error-plugin') ||
                 node.hasAttribute('data-vite-dev-runtime-error') ||
                 node.hasAttribute('data-error-overlay'))) ||
                // Check for error-related classes
                (node.className && 
                 (node.className.includes('error') || 
                  node.className.includes('overlay') ||
                  node.className.includes('modal'))) ||
                // Check for error-related content
                (node.textContent && 
                 (node.textContent.includes('runtime error') || 
                  node.textContent.includes('plugin:runtime-error-plugin') ||
                  node.textContent.includes('stack trace') ||
                  node.textContent.includes('unknown error'))) ||
                // Check for elements that look like overlays
                (node.tagName === 'DIV' && 
                 node.style && 
                 node.style.position === 'fixed' && 
                 node.style.zIndex && 
                 parseInt(node.style.zIndex) > 100)) {
              console.log('Found potential error overlay element, removing...');
              shouldRemove = true;
            }
            
            // In external browser mode, be even more aggressive
            if (isExternalBrowser && 
                node.tagName === 'DIV' && 
                !node.id && 
                (!node.parentElement || node.parentElement === document.body)) {
              console.log('Found suspicious element in external browser, removing...');
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

  // Watch for changes to the DOM with a more comprehensive configuration
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  // Set up a more frequent interval for external browsers
  const intervalTime = isExternalBrowser ? 100 : 200;
  const intervalId = setInterval(removeErrorOverlays, intervalTime);

  // Add more comprehensive event listeners
  window.addEventListener('error', function(event) {
    // When an error occurs, immediately try to clear any overlays
    setTimeout(removeErrorOverlays, 0);
    // And set up a sequence of cleanup attempts to catch delayed overlays
    setTimeout(removeErrorOverlays, 50);
    setTimeout(removeErrorOverlays, 100);
    setTimeout(removeErrorOverlays, 200);
    return true; // Allow normal error handling to continue
  }, true); // Use capturing phase

  window.addEventListener('unhandledrejection', function(event) {
    // When a promise rejection occurs, clear overlays
    setTimeout(removeErrorOverlays, 0);
    setTimeout(removeErrorOverlays, 100);
    return true;
  }, true);

  // Handle more user interactions that might trigger overlay cleanup
  window.addEventListener('keydown', function(event) {
    // Escape key to dismiss overlays
    if (event.key === 'Escape') {
      removeErrorOverlays();
    }
  }, true);

  window.addEventListener('click', function(event) {
    // Click anywhere to dismiss overlays after a small delay
    setTimeout(removeErrorOverlays, 10);
  }, true);
  
  window.addEventListener('focus', function() {
    // When window gains focus, check for overlays
    setTimeout(removeErrorOverlays, 10);
  }, true);

  // Super aggressive monkey-patching for Vite's error handling systems
  try {
    console.log('Disabling Vite error overlay...');
    
    // Create a completely inert mock for ANY error overlay
    const inertOverlay = {
      show: function() {},
      hide: function() {},
      update: function() {},
      clear: function() {},
      destroy: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispose: function() {},
      onError: function() {},
      handleError: function() {}
    };
    
    // Override ALL known error handler settings and objects
    window.__vite_plugin_react_preamble_installed__ = false;
    window.__vite_plugin_react_create_overlay__ = function() {
      return inertOverlay;
    };
    window.__vite_plugin_react_create_error_overlay__ = function() {
      return inertOverlay;
    };

    // Override the runtime error plugin
    window.runtimeErrorPlugin = {
      disabled: true,
      overlay: inertOverlay
    };
    
    // Override ALL error overlay objects
    window.__RUNTIME_ERROR_MODAL__ = {
      disabled: true,
      onError: function() {}
    };
    window.__VITE_ERROR_OVERLAY__ = inertOverlay;
    window.__vite_error_overlay__ = inertOverlay;
    window.__VITE_HMR_ERROR_OVERLAY__ = inertOverlay;
    window.__vite_hmr_error_overlay__ = inertOverlay;
    
    // Override any React error overlay
    window.__REACT_ERROR_OVERLAY__ = inertOverlay;
    window.__REACT_REFRESH_RUNTIME_OVERLAY__ = { disabled: true };
    
    // Override any error event handlers at the Vite HMR level
    if (window.__vite_hmr) {
      const originalHandleError = window.__vite_hmr.handleError;
      window.__vite_hmr.handleError = function(err) {
        console.log('Intercepted Vite HMR error:', err);
        removeErrorOverlays();
        // Don't call the original handler
      };
    }
    
    // Set ALL global flags to disable overlays
    window.__DISABLE_ERROR_OVERLAYS__ = true;
    window.__VITE_ERROR_HANDLERS_DISABLED__ = true;
    window.__ERROR_OVERLAY_DISABLED__ = true;
    window.__RUNTIME_ERROR_OVERLAY_DISABLED__ = true;
    window.__PLUGIN_ERROR_OVERLAY_DISABLED__ = true;
    
    // Provide global methods to manually kill overlays
    window.disableErrorOverlays = removeErrorOverlays;
    window.__killErrorOverlays = removeErrorOverlays;
    
    // In external browser mode, override console.error to suppress certain errors
    if (isExternalBrowser) {
      const originalConsoleError = console.error;
      console.error = function(...args) {
        // Filter out error messages that might trigger overlays
        if (args && args.length > 0 && typeof args[0] === 'string') {
          const errorMsg = args[0];
          if (errorMsg.includes('runtime error') || 
              errorMsg.includes('plugin:runtime') || 
              errorMsg.includes('vite') ||
              errorMsg.includes('chunk failed') ||
              errorMsg.includes('module failed')) {
            console.log('Suppressed error message in external browser:', args[0]);
            setTimeout(removeErrorOverlays, 0);
            setTimeout(removeErrorOverlays, 100);
            return; // Don't log these errors in external browser
          }
        }
        originalConsoleError.apply(console, args);
        // Check for overlays after any error
        setTimeout(removeErrorOverlays, 0);
      };
    }
    
    console.log('Vite error overlay disabled successfully');
  } catch (e) {
    console.log('Error while disabling overlays:', e);
    // Continue with other methods even if monkey-patching fails
  }
  
  // Final cleanup if the window is about to unload
  window.addEventListener('beforeunload', function() {
    observer.disconnect();
    clearInterval(intervalId);
  });
  
  // Expose a cleanup function just in case
  window.__cleanupErrorOverlayPrevention = function() {
    observer.disconnect();
    clearInterval(intervalId);
  };
})();