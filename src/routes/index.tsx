import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { supabase } from "@/integrations/supabase/client";
import { TrackerApp } from "@/components/tracker/TrackerApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Weekly Tracker — Plan your week" },
      {
        name: "description",
        content:
          "A minimal weekly productivity tracker with tasks and habits, inspired by Google Calendar.",
      },
      { property: "og:title", content: "Weekly Tracker" },
      { property: "og:description", content: "Plan tasks and track habits across your week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const signingIn = useRef(false);

  useEffect(() => {
    // No sign-in required: visitors get an invisible guest session so the
    // tracker is fully usable, and can upgrade it to a real account later.
    async function ensureSession() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        setIsGuest(data.user.is_anonymous === true);
        return;
      }
      if (signingIn.current) return;
      signingIn.current = true;
      const { data: anon } = await supabase.auth.signInAnonymously();
      signingIn.current = false;
      if (anon.user) {
        setUserId(anon.user.id);
        setIsGuest(true);
      }
    }
    void ensureSession();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setIsGuest(session.user.is_anonymous === true);
      } else {
        setUserId(null);
        void ensureSession();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!userId) {
    return <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }} />;
  }
  return <TrackerApp userId={userId} isGuest={isGuest} />;
}
