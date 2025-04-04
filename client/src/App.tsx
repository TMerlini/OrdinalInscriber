import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import FaqPage from "@/pages/FaqPage";
import { useEffect } from "react";
import { disableViteErrorOverlay } from "./lib/disableViteOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/faq" component={FaqPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Disable Vite error overlays that might interfere with the UI
  useEffect(() => {
    // Run the disableViteErrorOverlay function to aggressively remove error overlays
    const cleanup = disableViteErrorOverlay();
    
    // Also attempt to remove any error overlays when page loads or changes
    const handlePageChange = () => {
      try {
        // This will try to match and remove any error overlays
        document.querySelectorAll('[plugin\\:runtime-error-plugin], [data-plugin-runtime-error-plugin], .vite-error-overlay').forEach(el => {
          if (el.parentNode) {
            console.log('Removing overlay element on page change:', el);
            el.parentNode.removeChild(el);
          }
        });
        
        // Also try to override Vite's error handlers
        // @ts-ignore: Vite internal property
        window.__vite_plugin_react_preamble_installed__ = false;
      } catch (e) {
        // Ignore errors during cleanup
      }
    };
    
    // Call once immediately
    handlePageChange();
    
    // Set up listener for page changes
    window.addEventListener('popstate', handlePageChange);
    
    return () => {
      cleanup();
      window.removeEventListener('popstate', handlePageChange);
    };
  }, []);

  return (
    // Wrap the entire app in an ErrorBoundary to prevent Vite error overlays
    <ErrorBoundary disableViteOverlay={true}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
