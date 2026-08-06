import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppThemeProvider } from "@/lib/theme";
import { ToastHost } from "@/lib/toast";

/** Full-bleed centred slot shared by the 404 and error screens. */
function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ maxWidth: 440, textAlign: "center" }}>{children}</Box>
    </Box>
  );
}

function NotFoundComponent() {
  return (
    <CenteredMessage>
      <Typography variant="h1" sx={{ fontWeight: 300, color: "text.primary" }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ mt: 2 }}>
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button variant="contained" href="/" sx={{ mt: 4 }}>
        Go home
      </Button>
    </CenteredMessage>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <CenteredMessage>
      <Typography variant="h5">This page didn't load</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Something went wrong on our end. You can try refreshing or head back home.
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", mt: 4 }}>
        <Button
          variant="contained"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Try again
        </Button>
        <Button variant="outlined" href="/">
          Go home
        </Button>
      </Stack>
    </CenteredMessage>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { title: "Weekly Productivity Tracker" },
      {
        name: "description",
        content:
          "A minimalistic weekly productivity tracker with todos, habits, and progress stats.",
      },
      { property: "og:title", content: "Weekly Productivity Tracker" },
      {
        property: "og:description",
        content: "Plan tasks, track habits, and see weekly progress at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#f7f8fa" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Tracker" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Carries preferences saved by the pre-Material UI theme switcher over to the
 * keys Material UI's colour-scheme manager reads. Runs once, before
 * InitColorSchemeScript picks the scheme for the first paint.
 */
const LEGACY_THEME_MIGRATION = `try{
  if(!localStorage.getItem('mui-mode')){
    var t=localStorage.getItem('theme');
    if(t==='light'||t==='dark')localStorage.setItem('mui-mode',t);
  }
  if(!localStorage.getItem('mui-color-scheme-light')){
    var c=localStorage.getItem('themeColor');
    if(c&&c!=='blue'){
      localStorage.setItem('mui-color-scheme-light','light-'+c);
      localStorage.setItem('mui-color-scheme-dark','dark-'+c);
    }
  }
}catch(e){}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: LEGACY_THEME_MIGRATION }} />
        <InitColorSchemeScript attribute="class" defaultMode="system" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <ToastHost />
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
