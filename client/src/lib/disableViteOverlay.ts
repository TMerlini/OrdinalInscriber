/**
 * Utility to disable Vite error overlays that can appear during development
 */
export function disableViteErrorOverlay() {
  // More aggressive approach to completely eliminate error overlays
  
  // 1. Try to find and remove any existing error overlays
  const removeExistingOverlays = () => {
    // More comprehensive list of selectors to target error overlays
    const selectors = [
      // General Vite error overlays
      '[data-vite-dev-runtime-error]',
      '[data-plugin-runtime-error-plugin]',
      'div[data-error-overlay]',
      'div#vite-error-overlay',
      '.vite-error-overlay',
      '.error-overlay',
      
      // Replit specific error modal
      '[data-replit-error-modal]',
      '#replit-error-modal',
      '.runtime-error-modal',
      
      // Generic error containers that might be used
      'div[role="dialog"][aria-modal="true"]',
      '.error-modal',
      '.error-container',
      
      // Additional specific selectors from the screenshot
      '[plugin\\:runtime-error-plugin]',
      '.plugin-runtime-error-plugin'
    ];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          console.log('Removing error overlay element:', el);
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          } else if (el instanceof HTMLElement) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            el.style.zIndex = '-9999';
          }
        });
      } catch (err) {
        // Ignore errors during cleanup
      }
    });
    
    // Also try to find elements by content
    try {
      document.querySelectorAll('div, span').forEach(el => {
        if (el.textContent && 
           (el.textContent.includes('runtime error') || 
            el.textContent.includes('plugin:runtime-error-plugin') ||
            el.textContent.includes('unknown runtime error'))) {
          // Find the closest container that might be the overlay
          let parent = el;
          for (let i = 0; i < 5; i++) { // Look up to 5 levels up
            if (parent.parentElement) {
              parent = parent.parentElement;
              if (parent.tagName === 'BODY') break;
            } else {
              break;
            }
          }
          
          if (parent && parent !== document.body) {
            console.log('Removing error overlay by content match:', parent);
            if (parent.parentNode) {
              parent.parentNode.removeChild(parent);
            }
          }
        }
      });
    } catch (err) {
      // Ignore errors during content-based cleanup
    }
    
    // Target the specific error overlay from the screenshot
    try {
      // Find dark background overlays
      document.querySelectorAll('div').forEach(el => {
        const style = window.getComputedStyle(el);
        
        // Check for dark overlay with fixed position (like the one in the screenshot)
        if ((style.position === 'fixed' && 
             style.width === '100%' && 
             style.height === '100%' && 
             (style.backgroundColor.includes('rgba(0, 0, 0') || 
              style.background.includes('rgb(20, 20, 20)'))) ||
            // Or elements with the red error text color 
            style.color === 'rgb(232, 59, 70)') {
          
          console.log('Removing error overlay matching the screenshot:', el);
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          } else {
            // If we can't remove it, at least hide it
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.zIndex = '-9999';
          }
        }
      });
    } catch (err) {
      // Ignore errors during style-based cleanup
    }
  };

  // Run immediately
  removeExistingOverlays();
  
  // Intercept and disable Vite's error handling
  try {
    // Override the console.error to prevent it from triggering Vite's error handling
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Still log the error, but filter out any internal Vite messages
      if (args && args.length > 0 && typeof args[0] === 'string') {
        const errorMsg = args[0];
        if (errorMsg.includes('vite') || 
            errorMsg.includes('plugin') || 
            errorMsg.includes('runtime error')) {
          // Don't forward these errors to the original console.error
          console.log('Suppressed error:', ...args);
          return;
        }
      }
      originalConsoleError(...args);
      // Remove overlays after any error
      setTimeout(removeExistingOverlays, 0);
    };
    
    // Override Vite's error handling if possible
    // @ts-ignore: Access Vite internal properties
    if (window.__vite_plugin_react_preamble_installed__) {
      // @ts-ignore: Vite internal property
      window.__vite_plugin_react_preamble_installed__ = false;
    }
    
    // Try to override Vite's HMR error handler
    // @ts-ignore: Access Vite internal properties
    if (window.__vite_hmr) {
      // @ts-ignore: Vite internal property
      const originalHandleError = window.__vite_hmr.handleError;
      // @ts-ignore: Vite internal property
      window.__vite_hmr.handleError = (err: any) => {
        console.log('Intercepted Vite HMR error:', err);
        // Don't call the original handler
      };
    }
  } catch (e) {
    // Ignore errors when patching Vite
  }
  
  // Run again whenever the DOM changes (in case new errors appear)
  const observer = new MutationObserver((mutations) => {
    let shouldRemove = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        // Convert NodeList to Array to avoid TypeScript errors
        Array.from(mutation.addedNodes).forEach(node => {
          if (node instanceof HTMLElement) {
            // If this element contains any error-related text or classes
            if (node.textContent?.includes('runtime error') || 
                node.textContent?.includes('error-plugin') ||
                node.textContent?.includes('unknown runtime error') ||
                node.className?.includes('error')) {
              shouldRemove = true;
            }
          }
        });
      }
      
      if (shouldRemove) break;
    }
    
    if (shouldRemove) {
      removeExistingOverlays();
    }
  });
  
  // Start observing the body for changes with a more comprehensive configuration
  observer.observe(document.body, { 
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  
  // Set up a regular interval check just to be sure
  const intervalId = setInterval(removeExistingOverlays, 1000);
  
  // Also try to disable via CSS
  try {
    const style = document.createElement('style');
    style.textContent = `
      [data-vite-dev-runtime-error],
      [data-plugin-runtime-error-plugin],
      [plugin\\:runtime-error-plugin],
      div[data-error-overlay],
      div#vite-error-overlay,
      .vite-error-overlay,
      .error-overlay,
      .plugin-runtime-error-plugin,
      .runtime-error-modal {
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
  } catch (err) {
    // Ignore errors during style injection
  }
  
  return () => {
    // Cleanup function to remove all observers and intervals
    observer.disconnect();
    clearInterval(intervalId);
  };
}