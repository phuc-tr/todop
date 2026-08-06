import {
  createColorScheme,
  createTheme,
  type SupportedColorScheme,
  type ThemeOptions,
} from "@mui/material/styles";

declare module "@mui/material/styles" {
  /** Opts the theme's types into the CSS-variables API (`theme.vars`). */
  interface CssThemeVariables {
    enabled: true;
  }

  interface ColorSchemeOverrides {
    "light-green": true;
    "dark-green": true;
    "light-purple": true;
    "dark-purple": true;
    "light-rose": true;
    "dark-rose": true;
    "light-orange": true;
    "dark-orange": true;
    "light-amber": true;
    "dark-amber": true;
    "light-mono": true;
    "dark-mono": true;
  }
}

/**
 * The app ships one Material UI colour scheme per (mode × accent) pair, e.g.
 * `dark-rose`. Material UI emits every scheme as a block of CSS variables keyed
 * on a class name, so switching mode or accent is a pure class swap on <html> —
 * `InitColorSchemeScript` applies the stored one before hydration, which is why
 * neither the mode nor the accent flashes on first paint.
 */
export type ThemeColor = "blue" | "green" | "purple" | "rose" | "orange" | "amber" | "mono";
export type Mode = "light" | "dark";

type AccentTokens = { primary: string; success: string };

export const ACCENTS: Record<
  ThemeColor,
  { label: string; light: AccentTokens; dark: AccentTokens; swatch: string }
> = {
  blue: {
    label: "Blue",
    light: { primary: "#2275e8", success: "#2b9f4a" },
    dark: { primary: "#609efa", success: "#39b457" },
    swatch: "#2275e8",
  },
  green: {
    label: "Green",
    light: { primary: "#008c2f", success: "#2b9f4a" },
    dark: { primary: "#3bb360", success: "#39b457" },
    swatch: "#008c2f",
  },
  purple: {
    label: "Purple",
    light: { primary: "#735fe9", success: "#2b9f4a" },
    dark: { primary: "#968bff", success: "#39b457" },
    swatch: "#735fe9",
  },
  rose: {
    label: "Rose",
    light: { primary: "#d73246", success: "#2b9f4a" },
    dark: { primary: "#fd7277", success: "#39b457" },
    swatch: "#d73246",
  },
  orange: {
    label: "Orange",
    light: { primary: "#d64d00", success: "#2b9f4a" },
    dark: { primary: "#f47f46", success: "#39b457" },
    swatch: "#d64d00",
  },
  amber: {
    label: "Amber",
    light: { primary: "#ba7600", success: "#2b9f4a" },
    dark: { primary: "#dfa11a", success: "#39b457" },
    swatch: "#ba7600",
  },
  mono: {
    label: "Black & white",
    light: { primary: "#222222", success: "#3a3a3a" },
    dark: { primary: "#dedede", success: "#aeaeae" },
    swatch: "conic-gradient(#3a3a3a 0deg 180deg, #f0f0f0 180deg 360deg)",
  },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as ThemeColor[];

/** Blue is the default accent, so it owns the plain `light` / `dark` schemes. */
export function schemeName(mode: Mode, accent: ThemeColor): SupportedColorScheme {
  return (accent === "blue" ? mode : `${mode}-${accent}`) as SupportedColorScheme;
}

export function parseScheme(scheme: string | undefined): ThemeColor {
  if (!scheme) return "blue";
  const accent = scheme.replace(/^(light|dark)-?/, "");
  return (ACCENT_KEYS as string[]).includes(accent) ? (accent as ThemeColor) : "blue";
}

const NEUTRALS = {
  light: {
    background: { default: "#f7f8fa", paper: "#ffffff" },
    text: { primary: "#020618", secondary: "#62748e" },
    divider: "#e2e5e8",
    error: "#e7000b",
  },
  dark: {
    background: { default: "#020618", paper: "#0f172b" },
    text: { primary: "#f8fafc", secondary: "#90a1b9" },
    divider: "rgba(255, 255, 255, 0.12)",
    error: "#ff6467",
  },
} as const;

function colorScheme(mode: Mode, accent: ThemeColor) {
  const neutral = NEUTRALS[mode];
  const tokens = ACCENTS[accent][mode];
  return {
    palette: {
      mode,
      primary: { main: tokens.primary },
      success: { main: tokens.success },
      error: { main: neutral.error },
      background: neutral.background,
      text: neutral.text,
      divider: neutral.divider,
    },
  };
}

// `createTheme` expands the built-in `light` / `dark` entries itself, but hands
// any extra scheme straight through — those have to arrive already expanded by
// `createColorScheme`, or the palette is missing the nodes the CSS variable
// generator reads.
const colorSchemes = Object.fromEntries(
  (["light", "dark"] as Mode[]).flatMap((mode) =>
    ACCENT_KEYS.map((accent) => {
      const scheme = colorScheme(mode, accent);
      return [schemeName(mode, accent), accent === "blue" ? scheme : createColorScheme(scheme)];
    }),
  ),
) as ThemeOptions["colorSchemes"];

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes,
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Roboto", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    // Material's display sizes are far too loud for a dense planner, so the
    // headline scale is pulled in and tightened.
    h1: { fontSize: "3.5rem", fontWeight: 400, letterSpacing: "-0.02em" },
    h2: { fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.01em" },
    h3: { fontSize: "1.5rem", fontWeight: 400 },
    h4: { fontSize: "1.375rem", fontWeight: 500 },
    h5: { fontSize: "1.125rem", fontWeight: 500 },
    h6: { fontSize: "1rem", fontWeight: 500, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 500, letterSpacing: 0 },
    overline: { letterSpacing: "0.08em", fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { height: "100%" },
        body: { WebkitFontSmoothing: "antialiased" },
        // Slim, low-contrast scrollbars that stay out of the way in dense panes.
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(128,128,128,0.35) transparent",
        },
        "*::-webkit-scrollbar": { width: 6, height: 6 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          borderRadius: 999,
          backgroundColor: "rgba(128,128,128,0.35)",
        },
        // iOS zooms the page when focusing a control under 16px.
        "@media (max-width: 767px)": {
          "input, textarea, select": { fontSize: 16 },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // Material 3 buttons are pill-shaped.
        root: { borderRadius: 999 },
        sizeSmall: { paddingInline: 14 },
      },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 500 } },
    },
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
    },
    MuiDialog: {
      defaultProps: { slotProps: { paper: { elevation: 0 } } },
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiMenu: {
      defaultProps: { slotProps: { paper: { elevation: 3 } } },
      styleOverrides: { paper: { borderRadius: 12 } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 999 }, bar: { borderRadius: 999 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
});
