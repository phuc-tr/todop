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
    "light-blue": true;
    "dark-blue": true;
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
export type ThemeColor = "red" | "blue" | "green" | "purple" | "rose" | "orange" | "amber" | "mono";
export type Mode = "light" | "dark";

type AccentTokens = { primary: string; success: string };

export const ACCENTS: Record<
  ThemeColor,
  { label: string; light: AccentTokens; dark: AccentTokens; swatch: string }
> = {
  // Todoist's signature red is the default accent.
  red: {
    label: "Red",
    light: { primary: "#dc4c3e", success: "#058527" },
    dark: { primary: "#ff7066", success: "#4caf6a" },
    swatch: "#dc4c3e",
  },
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

export const DEFAULT_ACCENT: ThemeColor = "red";

/** The default accent owns the plain `light` / `dark` schemes. */
export function schemeName(mode: Mode, accent: ThemeColor): SupportedColorScheme {
  return (accent === DEFAULT_ACCENT ? mode : `${mode}-${accent}`) as SupportedColorScheme;
}

export function parseScheme(scheme: string | undefined): ThemeColor {
  if (!scheme) return DEFAULT_ACCENT;
  const accent = scheme.replace(/^(light|dark)-?/, "");
  return (ACCENT_KEYS as string[]).includes(accent) ? (accent as ThemeColor) : DEFAULT_ACCENT;
}

// Todoist-style neutrals: a plain white canvas, a warm off-white for side
// surfaces, near-black text and dividers faint enough to read as spacing.
const NEUTRALS = {
  light: {
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#202020", secondary: "#808080" },
    divider: "#f0f0f0",
    error: "#d1453b",
    sidebar: "#fcfaf8",
  },
  dark: {
    background: { default: "#1e1e1e", paper: "#1e1e1e" },
    text: { primary: "#e8e8e8", secondary: "#8a8a8a" },
    divider: "rgba(255, 255, 255, 0.07)",
    error: "#ff7066",
    sidebar: "#262626",
  },
} as const;

/** Background for side surfaces (the backlog drawer, panels). */
export const SIDEBAR_BG = "var(--app-sidebar-bg)";

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
      return [
        schemeName(mode, accent),
        accent === DEFAULT_ACCENT ? scheme : createColorScheme(scheme),
      ];
    }),
  ),
) as ThemeOptions["colorSchemes"];

/** Soft, wide, low-opacity shadow used for floating surfaces instead of borders. */
const FLOAT_SHADOW = "0 1px 8px rgba(0,0,0,0.08), 0 4px 24px rgba(0,0,0,0.06)";
/** Fill used where a bordered control would normally sit. */
const FILL = "rgba(128,128,128,0.08)";
const FILL_HOVER = "rgba(128,128,128,0.14)";

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes,
  // Todoist uses small, tight radii rather than Material's pills and big cards.
  shape: { borderRadius: 6 },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    fontSize: 14,
    h1: { fontSize: "3.5rem", fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontSize: "1.5rem", fontWeight: 700 },
    h4: { fontSize: "1.375rem", fontWeight: 700 },
    h5: { fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontSize: "1rem", fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    overline: { letterSpacing: 0, fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": { "--app-sidebar-bg": NEUTRALS.light.sidebar },
        ':root[class~="dark"], :root[class*="dark-"]': {
          "--app-sidebar-bg": NEUTRALS.dark.sidebar,
        },
        "html, body, #root": { height: "100%" },
        body: { WebkitFontSmoothing: "antialiased" },
        // Slim, low-contrast scrollbars that stay out of the way in dense panes.
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(128,128,128,0.3) transparent",
        },
        "*::-webkit-scrollbar": { width: 6, height: 6 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          borderRadius: 999,
          backgroundColor: "rgba(128,128,128,0.3)",
        },
        // iOS zooms the page when focusing a control under 16px.
        "@media (max-width: 767px)": {
          "input, textarea, select": { fontSize: 16 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" }, outlined: { border: 0 } },
    },
    MuiAppBar: { defaultProps: { elevation: 0, color: "inherit" } },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: { borderRadius: 6, boxShadow: "none" },
        sizeSmall: { paddingInline: 10, paddingBlock: 3, fontSize: 13 },
        // Borderless: the "outlined" variant reads as a quiet filled button.
        outlined: {
          border: 0,
          backgroundColor: FILL,
          color: "var(--mui-palette-text-primary)",
          "&:hover": { border: 0, backgroundColor: FILL_HOVER },
        },
        contained: { "&:hover": { boxShadow: "none", filter: "brightness(0.92)" } },
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: { borderRadius: 6, color: "var(--mui-palette-text-secondary)" },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { backgroundColor: FILL, borderRadius: 6, padding: 2, gap: 2 },
        grouped: { border: 0, borderRadius: "5px !important", margin: 0 },
      },
    },
    MuiToggleButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: 12,
          border: 0,
          paddingBlock: 3,
          color: "var(--mui-palette-text-secondary)",
          "&.Mui-selected, &.Mui-selected:hover": {
            backgroundColor: "var(--mui-palette-background-paper)",
            color: "var(--mui-palette-text-primary)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
          },
        },
      },
    },
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    // Fields are tinted wells with no outline until focused.
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: FILL,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1 },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: false, enterDelay: 400 },
      styleOverrides: {
        tooltip: { fontSize: 12, fontWeight: 500, borderRadius: 5, backgroundColor: "#303030" },
      },
    },
    MuiDialog: {
      defaultProps: { slotProps: { paper: { elevation: 0 } } },
      styleOverrides: { paper: { borderRadius: 10, boxShadow: FLOAT_SHADOW } },
    },
    MuiMenu: {
      defaultProps: { slotProps: { paper: { elevation: 0 } } },
      styleOverrides: {
        paper: { borderRadius: 8, boxShadow: FLOAT_SHADOW },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: 5, fontSize: 13, minHeight: 32 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "var(--mui-palette-divider)" } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, backgroundColor: FILL },
        bar: { borderRadius: 999 },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
});
