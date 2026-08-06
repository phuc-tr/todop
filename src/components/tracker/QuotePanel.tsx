import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CasinoOutlinedIcon from "@mui/icons-material/CasinoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

const COLLECTION_KEY = "tracker.quotes.collection";
const CUSTOM_PREFIX = "tracker.quotes.custom.";
const DISPLAYED_PREFIX = "tracker.quotes.displayed.";
const BG_PATH_PREFIX = "tracker.quotes.bg.path.";
const MODE_PREFIX = "tracker.quotes.mode.";
const BUCKET = "weekly-banners";

const DEFAULT_QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "Small deeds done are better than great deeds planned.",
  "You do not rise to the level of your goals. You fall to the level of your systems. — James Clear",
  "Discipline equals freedom. — Jocko Willink",
  "What gets measured gets managed. — Peter Drucker",
  "Focus is saying no to a thousand good ideas. — Steve Jobs",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
];

function loadCollection(): string[] {
  if (typeof window === "undefined") return DEFAULT_QUOTES;
  const raw = localStorage.getItem(COLLECTION_KEY);
  if (!raw) return DEFAULT_QUOTES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
  } catch {}
  return DEFAULT_QUOTES;
}

function pickRandom(list: string[], exclude?: string): string {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  let tries = 0;
  while (pick === exclude && tries < 5) {
    pick = list[Math.floor(Math.random() * list.length)];
    tries++;
  }
  return pick;
}

export function QuotePanel({ weekKey }: { weekKey: string }) {
  const customKey = CUSTOM_PREFIX + weekKey;
  const displayedKey = DISPLAYED_PREFIX + weekKey;
  const bgPathKey = BG_PATH_PREFIX + weekKey;
  const modeKey = MODE_PREFIX + weekKey;
  const [collection, setCollection] = useState<string[]>(() => loadCollection());
  const [custom, setCustom] = useState<string>("");
  const [displayed, setDisplayed] = useState<string>("");
  const [mode, setMode] = useState<"quote" | "text">("quote");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDraft, setDialogDraft] = useState("");
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persistWeek(next: {
    mode?: "quote" | "text";
    custom_text?: string;
    displayed_quote?: string;
  }) {
    const userId = userIdRef.current;
    if (!userId) return;
    await supabase.from("weekly_quotes").upsert({
      user_id: userId,
      week_key: weekKey,
      mode: next.mode ?? mode,
      custom_text: next.custom_text ?? custom,
      displayed_quote: next.displayed_quote ?? displayed,
    });
  }

  // Load the shared quote collection from the database once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      userIdRef.current = userId;
      if (!userId) return;
      const { data: row } = await supabase
        .from("quote_collections")
        .select("quotes")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (row?.quotes && row.quotes.length > 0) {
        setCollection(row.quotes);
      } else {
        const local = loadCollection();
        await supabase.from("quote_collections").upsert({ user_id: userId, quotes: local });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedCustom = localStorage.getItem(customKey) ?? "";
    setCustom(savedCustom);
    const savedMode = localStorage.getItem(modeKey);
    const initialMode: "quote" | "text" =
      savedMode === "text" || (savedMode == null && savedCustom.trim()) ? "text" : "quote";
    setMode(initialMode);
    const savedDisplayed = localStorage.getItem(displayedKey);
    if (savedDisplayed) {
      setDisplayed(savedDisplayed);
    } else {
      const pick = pickRandom(collection);
      setDisplayed(pick);
      if (pick) localStorage.setItem(displayedKey, pick);
    }
    // Load this week's quote state + background from DB (sync across devices),
    // migrating any legacy localStorage path if present.
    setBgUrl(null);
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      userIdRef.current = userId ?? null;
      if (userId) {
        const { data: qrow } = await supabase
          .from("weekly_quotes")
          .select("mode, custom_text, displayed_quote")
          .eq("user_id", userId)
          .eq("week_key", weekKey)
          .maybeSingle();
        if (cancelled) return;
        if (qrow) {
          setCustom(qrow.custom_text ?? "");
          setMode(qrow.mode === "text" ? "text" : "quote");
          if (qrow.displayed_quote) setDisplayed(qrow.displayed_quote);
        } else {
          // Migrate whatever this device has for the week.
          await supabase.from("weekly_quotes").upsert({
            user_id: userId,
            week_key: weekKey,
            mode: initialMode,
            custom_text: savedCustom,
            displayed_quote: localStorage.getItem(displayedKey) ?? "",
          });
        }
      }
      let path: string | null = null;
      if (userId) {
        const { data: row } = await supabase
          .from("weekly_backgrounds")
          .select("path")
          .eq("user_id", userId)
          .eq("week_key", weekKey)
          .maybeSingle();
        path = row?.path ?? null;
        if (!path) {
          const legacy = localStorage.getItem(bgPathKey);
          if (legacy) {
            path = legacy;
            await supabase
              .from("weekly_backgrounds")
              .upsert({ user_id: userId, week_key: weekKey, path: legacy });
          }
        }
      } else {
        path = localStorage.getItem(bgPathKey);
      }
      if (cancelled || !path) return;
      const { data: signed, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!cancelled && !error && signed?.signedUrl) setBgUrl(signed.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  function shuffle() {
    const pick = pickRandom(collection, displayed);
    setDisplayed(pick);
    if (typeof window !== "undefined" && pick) localStorage.setItem(displayedKey, pick);
    if (pick) void persistWeek({ displayed_quote: pick });
  }

  function saveCustom(value: string) {
    setCustom(value);
    if (typeof window !== "undefined") {
      if (value.trim()) localStorage.setItem(customKey, value);
      else localStorage.removeItem(customKey);
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistWeek({ custom_text: value });
    }, 600);
  }

  function setModePersisted(next: "quote" | "text") {
    setMode(next);
    if (typeof window !== "undefined") localStorage.setItem(modeKey, next);
    void persistWeek({ mode: next });
  }

  function openDialog() {
    setDialogDraft(collection.join("\n"));
    setDialogOpen(true);
  }

  function saveCollection() {
    const next = dialogDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setCollection(next);
    if (typeof window !== "undefined") localStorage.setItem(COLLECTION_KEY, JSON.stringify(next));
    if (userIdRef.current) {
      void supabase.from("quote_collections").upsert({ user_id: userIdRef.current, quotes: next });
    }
    const pick = pickRandom(next);
    setDisplayed(pick);
    if (typeof window !== "undefined" && pick) localStorage.setItem(displayedKey, pick);
    if (pick) void persistWeek({ displayed_quote: pick, custom_text: custom, mode });
    setDialogOpen(false);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userData.user.id}/${weekKey}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      // Remove previous stored path if different (e.g. different extension)
      const { data: prevRow } = await supabase
        .from("weekly_backgrounds")
        .select("path")
        .eq("user_id", userData.user.id)
        .eq("week_key", weekKey)
        .maybeSingle();
      const prev = prevRow?.path ?? localStorage.getItem(bgPathKey);
      if (prev && prev !== path) {
        await supabase.storage
          .from(BUCKET)
          .remove([prev])
          .catch(() => {});
      }
      const { error: upsertErr } = await supabase
        .from("weekly_backgrounds")
        .upsert({ user_id: userData.user.id, week_key: weekKey, path });
      if (upsertErr) throw upsertErr;
      localStorage.setItem(bgPathKey, path);
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr) throw signErr;
      setBgUrl(signed.signedUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function clearBackground() {
    setBgUrl(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    let path: string | null = localStorage.getItem(bgPathKey);
    if (userId) {
      const { data: row } = await supabase
        .from("weekly_backgrounds")
        .select("path")
        .eq("user_id", userId)
        .eq("week_key", weekKey)
        .maybeSingle();
      if (row?.path) path = row.path;
      await supabase
        .from("weekly_backgrounds")
        .delete()
        .eq("user_id", userId)
        .eq("week_key", weekKey);
    }
    localStorage.removeItem(bgPathKey);
    if (path) {
      await supabase.storage
        .from(BUCKET)
        .remove([path])
        .catch(() => {});
    }
  }

  // Over a photo the panel switches to light-on-scrim text; otherwise it reads
  // as a normal outlined surface.
  const onImage = Boolean(bgUrl);

  const toolButtonSx = {
    color: onImage ? "common.white" : "text.secondary",
    "&:hover": { bgcolor: onImage ? "rgba(255,255,255,0.16)" : "action.hover" },
  } as const;

  return (
    <Paper
      variant={onImage ? "elevation" : "outlined"}
      elevation={onImage ? 2 : 0}
      sx={{
        position: "relative",
        overflow: "hidden",
        px: 2.5,
        py: 2,
        width: "100%",
        flex: { sm: 1 },
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        alignItems: "stretch",
        gap: 1,
        backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "box-shadow .2s",
        "&:hover": { boxShadow: 3 },
        "&:hover .quote-tools": { opacity: 1 },
      }}
    >
      {onImage && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.45)",
            pointerEvents: "none",
          }}
        />
      )}

      <Box
        sx={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {mode === "text" ? (
          <InputBase
            multiline
            value={custom}
            onChange={(e) => saveCustom(e.target.value)}
            placeholder="Write anything…"
            sx={{
              flex: 1,
              alignItems: "flex-start",
              p: 0,
              fontSize: 14,
              color: onImage ? "common.white" : "text.primary",
              textShadow: onImage ? "0 1px 2px rgba(0,0,0,0.7)" : undefined,
              "& textarea": { height: "100% !important", overflow: "auto !important" },
              "& ::placeholder": { color: onImage ? "rgba(255,255,255,0.7)" : undefined },
            }}
          />
        ) : (
          <Typography
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              fontSize: 16,
              lineHeight: 1.4,
              fontStyle: displayed ? "normal" : "italic",
              color: onImage ? "common.white" : displayed ? "text.primary" : "text.secondary",
              textShadow: onImage ? "0 1px 2px rgba(0,0,0,0.7)" : undefined,
            }}
          >
            {displayed || "No quotes yet — use the list icon to add some."}
          </Typography>
        )}
      </Box>

      <Stack
        className="quote-tools"
        spacing={0.25}
        sx={{
          position: "relative",
          flexShrink: 0,
          opacity: 0.55,
          transition: "opacity .2s",
          "&:focus-within": { opacity: 1 },
          "& svg": onImage ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" } : undefined,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Tooltip title={onImage ? "Remove background" : "Set background image"}>
          <span>
            <IconButton
              size="small"
              disabled={uploading}
              onClick={() => {
                if (onImage) clearBackground();
                else fileInputRef.current?.click();
              }}
              aria-label={onImage ? "Remove background" : "Set background image"}
              sx={toolButtonSx}
            >
              {onImage ? (
                <CloseIcon sx={{ fontSize: 16 }} />
              ) : (
                <ImageOutlinedIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        {mode === "quote" && (
          <>
            <Tooltip title="Shuffle quote">
              <IconButton
                size="small"
                onClick={shuffle}
                aria-label="Shuffle quote"
                sx={toolButtonSx}
              >
                <CasinoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit quote collection">
              <IconButton
                size="small"
                onClick={openDialog}
                aria-label="Edit quote collection"
                sx={toolButtonSx}
              >
                <FormatListBulletedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={mode === "text" ? "Switch to quotes" : "Switch to free text"}>
          <IconButton
            size="small"
            onClick={() => setModePersisted(mode === "text" ? "quote" : "text")}
            aria-label={mode === "text" ? "Switch to quotes" : "Switch to free text"}
            sx={toolButtonSx}
          >
            {mode === "text" ? (
              <FormatQuoteIcon sx={{ fontSize: 16 }} />
            ) : (
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Quote collection</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            One quote per line. Blank lines are ignored.
          </Typography>
          <TextField
            multiline
            minRows={10}
            fullWidth
            value={dialogDraft}
            onChange={(e) => setDialogDraft(e.target.value)}
            placeholder="Add one quote per line…"
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveCollection}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
