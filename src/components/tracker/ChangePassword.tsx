import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("No signed-in account found.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (verifyError) throw new Error("Current password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;

      toast.success("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="subtitle2">Password</Typography>
          <Typography variant="caption" color="text.secondary">
            Change the password for your account.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Change"}
        </Button>
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Stack component="form" onSubmit={submit} spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            type="password"
            label="Current password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            fullWidth
          />
          <TextField
            type="password"
            label="New password"
            autoComplete="new-password"
            slotProps={{ htmlInput: { minLength: 6 } }}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            fullWidth
          />
          <TextField
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            slotProps={{ htmlInput: { minLength: 6 } }}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={loading} fullWidth>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
}
