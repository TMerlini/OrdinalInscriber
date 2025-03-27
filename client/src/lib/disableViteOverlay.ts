/**
 * Utility to disable Vite error overlays that can appear during development
 */
export function disableViteErrorOverlay() {
  // Try to find and remove any existing error overlays
  const removeExistingOverlays = () => {
    const selectors = [
      '[data-vite-dev-runtime-error]',
      '[data-plugin-runtime-error-plugin]',
      'div[data-error-overlay]',
      'div#vite-error-overlay',
      '.vite-error-overlay',
      '.error-overlay'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });
  };

  // Run immediately
  removeExistingOverlays();
  
  // Run again whenever the DOM changes (in case new errors appear)
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        removeExistingOverlays();
      }
    }
  });
  
  // Start observing the body for changes
  observer.observe(document.body, { 
    childList: true,
    subtree: true 
  });
  
  // Also try to patch Vite's error handling
  try {
    // @ts-ignore: Vite internal property
    if (window.__vite_plugin_react_preamble_installed__) {
      // @ts-ignore: Vite internal property
      window.__vite_plugin_react_preamble_installed__ = false;
    }
  } catch (e) {
    // Ignore errors if property doesn't exist
  }
  
  return () => {
    // Cleanup function to disconnect observer if needed
    observer.disconnect();
  };
}