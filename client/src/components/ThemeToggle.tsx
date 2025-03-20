import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check if user has a preferred theme in localStorage
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    
    // Check if user has a system preference
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)").matches 
      ? "dark" 
      : "light";
    
    // Use stored theme if available, otherwise use system preference
    const initialTheme = storedTheme || systemPreference;
    setTheme(initialTheme);
    
    // Apply the theme to the document
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className="rounded-full w-9 h-9 border-orange-200 dark:border-navy-600 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-orange-700" />
      ) : (
        <Sun className="h-4 w-4 text-orange-400" />
      )}
    </Button>
  );
}