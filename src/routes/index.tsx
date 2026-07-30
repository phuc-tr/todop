import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId === null) navigate({ to: "/auth", replace: true });
  }, [userId, navigate]);

  if (!userId) {
    return <div className="min-h-screen bg-background" />;
  }
  return <TrackerApp userId={userId} />;
}
