import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — Weekly Tracker" },
      { name: "description", content: "Choose a new password for your weekly productivity tracker account." },
      { property: "og:title", content: "Set a new password — Weekly Tracker" },
      { property: "og:description", content: "Choose a new password for your weekly productivity tracker account." },
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <CheckSquare className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-medium tracking-tight">Weekly Tracker</h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-1">Set a new password</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {ready ? "Choose a new password for your account." : "Open this page from the reset link in your email."}
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? "Please wait…" : "Update password"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/auth" })}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}