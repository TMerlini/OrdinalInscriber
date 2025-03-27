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

// Helper function to prevent Vite from showing its error overlay
const disableViteOverlay = () => {
  try {
    // Try to hide error overlays that might be created by Vite
    const selectors = [
      '[plugin\\:runtime-error-plugin]',
      '[data-plugin-runtime-error-plugin]',
      'div[data-vite-dev-runtime-error]',
      'div[data-error-overlay]',
      'div#vite-error-overlay',
      '.vite-error-overlay',
      '.plugin-runtime-error-plugin',
      '.runtime-error-modal',
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.parentNode) {
          console.log('Removing overlay element from ErrorBoundary:', el);
          el.parentNode.removeChild(el);
        }
      });
    });
    
    // Also try to override Vite's error handlers
    // @ts-ignore: Vite internal property
    window.__vite_plugin_react_preamble_installed__ = false;
    
    // @ts-ignore: Vite internal property
    if (window.__vite_error_overlay__) {
      // @ts-ignore: Vite internal property
      window.__vite_error_overlay__ = {
        inject: () => {},
        onErrorOverlay: () => {}
      };
    }
    
    // Set a flag that our error handling has been activated
    // @ts-ignore: Custom property
    window.__error_boundary_handling_active__ = true;
  } catch (e) {
    // Ignore errors when trying to disable Vite overlay
  }
};

class ErrorBoundary extends Component<Props, State> {
  private intervalId: NodeJS.Timeout | null = null;
  
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    // Start checking for and removing error overlays
    if (props.disableViteOverlay !== false) {
      this.intervalId = setInterval(disableViteOverlay, 300);
    }
  }
  
  componentWillUnmount() {
    // Clean up interval when component unmounts
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

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
            onClick={() => this.setState({ hasError: false, error: null })}
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