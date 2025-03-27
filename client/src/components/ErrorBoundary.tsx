import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  disableViteOverlay?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Check if we're likely in an external browser vs. Replit environment
const isExternalBrowser = typeof window !== 'undefined' &&
                          window.location && 
                          !window.location.hostname.includes('replit') && 
                          !window.location.hostname.includes('localhost') &&
                          !window.location.hostname.includes('127.0.0.1');

// Helper function to prevent Vite from showing its error overlay
// This is significantly more aggressive in external browser mode
const disableViteOverlay = () => {
  try {
    // Try to hide error overlays that might be created by Vite
    const selectors = [
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
      
      // External browser specific selectors
      'div[role="dialog"][aria-modal="true"]',
      '.fixed.inset-0',
      'div.overlay-container',
      'div.error-container',
      'div.error-message',
      'div.error-stack',
      'div.error-frame'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.parentNode) {
          console.log('Removing overlay element from ErrorBoundary:', selector);
          el.parentNode.removeChild(el);
        } else if (el instanceof HTMLElement) {
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
    });
    
    // For external browser, also look for error overlays by their visual characteristics
    if (isExternalBrowser) {
      try {
        document.querySelectorAll('div').forEach(el => {
          // Skip elements that are clearly not overlays
          if (el.id === 'root' || el.classList.contains('app')) {
            return;
          }
          
          try {
            const style = window.getComputedStyle(el);
            
            // If it's a fixed position element with dark background or high z-index, it's likely an overlay
            if ((style.position === 'fixed' && 
                 ((style.backgroundColor && style.backgroundColor.includes('rgba(0, 0, 0')) || 
                  (style.background && style.background.includes('rgb(20, 20, 20)'))) &&
                 parseInt(style.zIndex, 10) > 10) || 
                // Or it has error-like content
                (el.textContent && 
                 (el.textContent.includes('runtime error') || 
                  el.textContent.includes('plugin:runtime-error-plugin') ||
                  el.textContent.includes('stack trace')))) {
              
              if (el.parentNode) {
                console.log('Removing overlay-like element from ErrorBoundary');
                el.parentNode.removeChild(el);
              } else if (el instanceof HTMLElement) {
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
        // Ignore errors during error overlay detection
      }
    }
    
    // Create an inert mock object for all error handlers
    const emptyHandler = () => {};
    const inertOverlay = {
      show: emptyHandler,
      hide: emptyHandler,
      update: emptyHandler,
      clear: emptyHandler,
      destroy: emptyHandler,
      dispose: emptyHandler,
      onError: emptyHandler,
      handleError: emptyHandler
    };
    
    // Also try to override ALL known Vite error handlers
    // @ts-ignore: Vite internal property
    window.__vite_plugin_react_preamble_installed__ = false;
    // @ts-ignore: Vite internal property
    window.__vite_plugin_react_runtime_error_overlay_handler = () => {};
    // @ts-ignore: Vite internal property
    window.__vite_plugin_react_overlay_shown = false;
    // @ts-ignore: Vite internal property
    window.__vite_plugin_react_create_overlay__ = () => inertOverlay;
    // @ts-ignore: Vite internal property
    window.__vite_plugin_react_create_error_overlay__ = () => inertOverlay;
    
    // @ts-ignore: Vite internal property
    window.__vite_error_overlay__ = inertOverlay;
    // @ts-ignore: Vite internal property
    window.__VITE_ERROR_OVERLAY__ = inertOverlay;
    // @ts-ignore: Vite internal property 
    window.__RUNTIME_ERROR_MODAL__ = { disabled: true, onError: emptyHandler };
    // @ts-ignore: Vite internal property
    window.runtimeErrorPlugin = { disabled: true, overlay: inertOverlay };
    // @ts-ignore: Vite internal property
    window.__REACT_ERROR_OVERLAY__ = inertOverlay;
    // @ts-ignore: Vite internal property
    window.__REACT_REFRESH_RUNTIME_OVERLAY__ = { disabled: true };
    
    // Override any error event handlers at the Vite HMR level
    // @ts-ignore: Vite internal property
    if (window.__vite_hmr) {
      // @ts-ignore: Vite internal property
      window.__vite_hmr.handleError = (err: any) => {
        console.log('Intercepted Vite HMR error:', err);
        // Return empty to prevent default handling
      };
    }
    
    // Set ALL global flags to disable overlays
    // @ts-ignore: Custom property
    window.__DISABLE_ERROR_OVERLAYS__ = true;
    // @ts-ignore: Custom property
    window.__VITE_ERROR_HANDLERS_DISABLED__ = true;
    // @ts-ignore: Custom property
    window.__ERROR_OVERLAY_DISABLED__ = true;
    // @ts-ignore: Custom property 
    window.__RUNTIME_ERROR_OVERLAY_DISABLED__ = true;
    // @ts-ignore: Custom property
    window.__PLUGIN_ERROR_OVERLAY_DISABLED__ = true;
    // @ts-ignore: Custom property
    window.__error_boundary_handling_active__ = true;
    
    // If window has our global kill function from the inline script, use it
    // @ts-ignore: Custom property
    if (window.__killErrorOverlays && typeof window.__killErrorOverlays === 'function') {
      // @ts-ignore: Custom property
      window.__killErrorOverlays();
    }
  } catch (e) {
    // Ignore errors when trying to disable Vite overlay
    console.log('Error while disabling Vite overlay:', e);
  }
};

class ErrorBoundary extends Component<Props, State> {
  private intervalId: NodeJS.Timeout | null = null;
  private observer: MutationObserver | null = null;
  
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    // Start checking for and removing error overlays
    if (props.disableViteOverlay !== false) {
      // Run more frequently in external browser mode
      const interval = isExternalBrowser ? 100 : 300;
      this.intervalId = setInterval(disableViteOverlay, interval);
      
      // Also set up a MutationObserver to catch error overlays as they appear
      if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
        this.setupMutationObserver();
      }
    }
  }
  
  // Set up a MutationObserver to detect and remove error overlays
  private setupMutationObserver() {
    try {
      this.observer = new MutationObserver((mutations) => {
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
                  console.log("ErrorBoundary observer found error-related element");
                  shouldRemove = true;
                }
                
                // In external browser mode, be even more aggressive
                if (isExternalBrowser && 
                    node.tagName === 'DIV' && 
                    !node.id && 
                    (!node.parentElement || node.parentElement === document.body)) {
                  console.log("ErrorBoundary found suspicious element in external browser");
                  shouldRemove = true;
                }
              }
            });
          }
        });
        
        if (shouldRemove) {
          disableViteOverlay();
        }
      });
      
      // Watch for DOM changes with a comprehensive configuration
      this.observer.observe(document.documentElement, { 
        childList: true, 
        subtree: true,
        attributes: true
      });
    } catch (e) {
      console.log('Error setting up MutationObserver in ErrorBoundary:', e);
    }
  }
  
  componentDidMount() {
    // Add event listeners to catch errors
    window.addEventListener('error', this.errorEventHandler, true);
    window.addEventListener('unhandledrejection', this.errorEventHandler, true);
    
    // Apply CSS to hide overlays right after mounting
    this.injectOverlayBlockingCSS();
  }
  
  componentWillUnmount() {
    // Clean up all resources when component unmounts
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Remove event listeners
    window.removeEventListener('error', this.errorEventHandler, true);
    window.removeEventListener('unhandledrejection', this.errorEventHandler, true);
  }
  
  // Inject CSS to block overlays
  private injectOverlayBlockingCSS() {
    try {
      const style = document.createElement('style');
      style.textContent = `
        /* Hide error overlays via CSS */
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
        }
        
        ${isExternalBrowser ? `
        /* External browser specific overrides */
        div[role="dialog"],
        .fixed.inset-0,
        div.modal-overlay,
        div.modal-backdrop {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        body.overflow-hidden,
        body.has-modal {
          overflow: auto !important;
        }
        ` : ''}
      `;
      document.head.appendChild(style);
    } catch (e) {
      console.log('Error injecting CSS in ErrorBoundary:', e);
    }
  }
  
  // Error event handler
  private errorEventHandler = (event: Event) => {
    console.log('ErrorBoundary caught error event:', event.type);
    
    // Run error overlay removal immediately and after delays to catch async errors
    disableViteOverlay();
    setTimeout(disableViteOverlay, 50);
    setTimeout(disableViteOverlay, 200);
    
    // Don't prevent default error handling
    return true;
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    // Also try to prevent Vite from showing its overlay
    disableViteOverlay();
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error);
    
    // Disable Vite's error overlay whenever we catch an error
    if (this.props.disableViteOverlay !== false) {
      disableViteOverlay();
      // Run it again after a short delay to catch any async overlays
      setTimeout(disableViteOverlay, 50);
      setTimeout(disableViteOverlay, 200);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return (
        <div className="p-4 bg-orange-50 dark:bg-navy-800 border border-orange-200 dark:border-navy-600 rounded-md">
          <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            This section encountered an error. The application will continue to function.
          </p>
          <button
            onClick={() => {
              // Clean up any error overlays before retrying
              disableViteOverlay();
              this.setState({ hasError: false, error: null });
            }}
            className="px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-md hover:bg-orange-700 dark:hover:bg-orange-800 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;