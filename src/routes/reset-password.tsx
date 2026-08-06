import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { BrandMark } from "@/components/tracker/BrandMark";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — Weekly Tracker" },
      {
        name: "description",
        content: "Choose a new password for your weekly productivity tracker account.",
      },
      { property: "og:title", content: "Set a new password — Weekly Tracker" },
      {
        property: "og:description",
        content: "Choose a new password for your weekly productivity tracker account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

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
            Set a new password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            {ready
              ? "Choose a new password for your account."
              : "Open this page from the reset link in your email."}
          </Typography>
          <Stack component="form" onSubmit={submit} spacing={2}>
            <TextField
              label="New password"
              type="password"
              required
              fullWidth
              autoComplete="new-password"
              slotProps={{ htmlInput: { minLength: 6 } }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready}
            />
            <TextField
              label="Confirm password"
              type="password"
              required
              fullWidth
              autoComplete="new-password"
              slotProps={{ htmlInput: { minLength: 6 } }}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!ready}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || !ready}
            >
              {loading ? "Please wait…" : "Update password"}
            </Button>
          </Stack>
          <Box sx={{ mt: 2.5, textAlign: "center" }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              underline="hover"
              color="text.secondary"
              onClick={() => navigate({ to: "/auth" })}
            >
              Back to sign in
            </Link>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
