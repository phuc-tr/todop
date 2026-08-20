import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/tracker/BrandMark";

type OAuthDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: the Supabase client reads its session from localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session || data.session.user.is_anonymous) {
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  head: () => ({
    meta: [
      { title: "Connect an app — datewise" },
      {
        name: "description",
        content: "Approve or deny an AI assistant's request to use your datewise tracker.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <Shell>
      <Typography variant="h6">Could not load this request</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {String((error as Error)?.message ?? error)}
      </Typography>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <BrandMark />
        </Box>
        <Paper variant="outlined" sx={{ p: 3 }}>
          {children}
        </Paper>
      </Box>
    </Box>
  );
}

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "This app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <Typography variant="h5" component="h1">
        Connect {clientName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {clientName} is asking to read and change your tasks, habits and weekly progress in datewise,
        acting as you. You can disconnect it at any time from the connected app.
      </Typography>
      {error && (
        <Typography role="alert" variant="body2" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
        <Button variant="contained" fullWidth disabled={busy} onClick={() => decide(true)}>
          {busy ? "Please wait…" : "Approve"}
        </Button>
        <Button variant="outlined" color="inherit" fullWidth disabled={busy} onClick={() => decide(false)}>
          Deny
        </Button>
      </Stack>
    </Shell>
  );
}
