import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Password</Label>
          <p className="text-[11px] text-muted-foreground">Change the password for your account.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Change"}
        </Button>
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <Input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" size="sm" disabled={loading} className="w-full">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
