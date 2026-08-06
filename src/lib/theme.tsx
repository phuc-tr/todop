import { type ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { parseScheme, schemeName, theme, type Mode, type ThemeColor } from "./muiTheme";

export type { ThemeColor, Mode };

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/**
 * Thin wrapper over Material UI's colour-scheme manager that splits the active
 * scheme back into the two axes the UI exposes: light/dark and accent colour.
 * `mounted` is false during SSR and the hydration render, where the resolved
 * scheme isn't known yet — controls that mirror it should stay neutral until then.
 */
export function useAppTheme() {
  const { mode, setMode, colorScheme, setColorScheme } = useColorScheme();

  const mounted = colorScheme !== undefined;
  const resolvedMode: Mode = colorScheme?.startsWith("dark") ? "dark" : "light";
  const themeColor = parseScheme(colorScheme);

  return {
    mounted,
    mode: resolvedMode,
    /** The stored preference, which may be "system". */
    modePreference: mode,
    toggle: () => setMode(resolvedMode === "dark" ? "light" : "dark"),
    themeColor,
    setThemeColor: (accent: ThemeColor) =>
      setColorScheme({ light: schemeName("light", accent), dark: schemeName("dark", accent) }),
  };
}
