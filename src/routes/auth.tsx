import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import SvgIcon from "@mui/material/SvgIcon";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/lib/toast";
import { BrandMark } from "@/components/tracker/BrandMark";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Weekly Tracker" },
      { name: "description", content: "Sign in to your weekly productivity tracker." },
    ],
  }),
});

function GoogleIcon() {
  return (
    <SvgIcon viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </SvgIcon>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // A pending "connect an assistant" flow parks its consent URL in ?next=…;
  // every sign-in path has to return there instead of the app root.
  function pendingNext(): string | null {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("next");
    return value && /^\/[^/\\]/.test(value) ? value : null;
  }

  function goAfterAuth() {
    const next = pendingNext();
    if (next) {
      window.location.replace(next);
      return;
    }
    navigate({ to: "/" });
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !data.user.is_anonymous) goAfterAuth();
      if (data.user?.is_anonymous) {
        setIsGuest(true);
        setMode("signup");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && !session.user.is_anonymous) {
        goAfterAuth();
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent. Check your email.");
      } else if (mode === "signup") {
        if (isGuest) {
          // Upgrade the guest session in place so existing data is kept.
          const { error } = await supabase.auth.updateUser({ email, password });
          if (error) throw error;
          toast.success("Almost there — confirm the link in your email to finish saving your data.");
        } else {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin + (pendingNext() ?? "/") },
          });
          if (error) throw error;
          toast.success("Account created. Check your email if confirmation is required.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + (pendingNext() ?? "/"),
    });
    if (result.error) toast.error("Google sign in failed");
  }

  const heading =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";
  const blurb =
    mode === "signin"
      ? "Sign in to continue."
      : mode === "signup"
        ? isGuest
          ? "Create an account to keep the week you've already planned and sync it across devices."
          : "Start tracking your week."
        : "We'll email you a link to set a new password.";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
        py: 6,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <BrandMark />
        </Box>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h5" component="h1">
            {heading}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            {blurb}
          </Typography>

          {mode !== "forgot" && (
            <>
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                size="large"
                onClick={google}
                startIcon={<GoogleIcon />}
              >
                Continue with Google
              </Button>
              <Divider sx={{ my: 2.5 }}>
                <Typography variant="caption" color="text.secondary">
                  or
                </Typography>
              </Divider>
            </>
          )}

          <Stack component="form" onSubmit={submit} spacing={2}>
            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== "forgot" && (
              <TextField
                label="Password"
                type="password"
                required
                fullWidth
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                slotProps={{ htmlInput: { minLength: 6 } }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </Button>
          </Stack>

          <Stack spacing={1} sx={{ mt: 2.5, textAlign: "center" }}>
            {mode === "signin" && (
              <Link
                component="button"
                type="button"
                variant="body2"
                underline="hover"
                color="text.secondary"
                onClick={() => setMode("forgot")}
              >
                Forgot password?
              </Link>
            )}
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              color="text.secondary"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "No account? Sign up"
                : mode === "signup"
                  ? "Have an account? Sign in"
                  : "Back to sign in"}
            </Link>
          </Stack>

          <Box sx={{ mt: 1, textAlign: "center" }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              color="text.secondary"
              onClick={() => navigate({ to: "/" })}
            >
              Continue without an account
            </Link>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
