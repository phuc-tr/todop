import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
export type ThemeColor = "blue" | "green" | "purple" | "rose" | "orange" | "amber" | "mono";

const ThemeCtx = createContext<{
  theme: Theme;
  themeColor: ThemeColor;
  toggle: () => void;
  setThemeColor: (color: ThemeColor) => void;
}>({
  theme: "light",
  themeColor: "blue",
  toggle: () => {},
  setThemeColor: () => {},
});

const THEME_KEY = "theme";
const THEME_COLOR_KEY = "themeColor";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [themeColor, setThemeColorState] = useState<ThemeColor>("blue");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const storedColor = localStorage.getItem(THEME_COLOR_KEY) as ThemeColor | null;
    const initialTheme =
      storedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
    if (storedColor) setThemeColorState(storedColor);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme-color", themeColor);
    localStorage.setItem(THEME_COLOR_KEY, themeColor);
  }, [themeColor]);

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        themeColor,
        toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")),
        setThemeColor: setThemeColorState,
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
