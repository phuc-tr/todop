import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Dices, Pencil, ImagePlus, X, Quote, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    // Load background for this week from DB (sync across devices),
    // migrating any legacy localStorage path if present.
    setBgUrl(null);
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
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
  }

  function saveCustom(value: string) {
    setCustom(value);
    if (typeof window !== "undefined") {
      if (value.trim()) localStorage.setItem(customKey, value);
      else localStorage.removeItem(customKey);
    }
  }

  function setModePersisted(next: "quote" | "text") {
    setMode(next);
    if (typeof window !== "undefined") localStorage.setItem(modeKey, next);
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
    const pick = pickRandom(next);
    setDisplayed(pick);
    if (typeof window !== "undefined" && pick) localStorage.setItem(displayedKey, pick);
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
        await supabase.storage.from(BUCKET).remove([prev]).catch(() => {});
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
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card px-4 py-3 shadow-sm w-full sm:flex-1 flex items-stretch gap-2 group overflow-hidden min-h-0",
        bgUrl ? "border-background/30 dark:border-background/45" : "border-border",
      )}
      style={
        bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {bgUrl && (
        <div className="absolute -inset-px rounded-lg bg-background/30 dark:bg-background/45 pointer-events-none" />
      )}
      <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
        {mode === "text" ? (
          <Textarea
            value={custom}
            onChange={(e) => saveCustom(e.target.value)}
            placeholder="Write anything…"
            className="flex-1 min-h-0 h-full text-sm resize-none bg-transparent"
          />
        ) : (
          <div
            className={cn(
              "flex-1 min-h-0 w-full text-sm leading-snug px-1 -mx-1 py-0.5 overflow-auto",
              displayed ? "text-foreground" : "text-muted-foreground italic",
            )}
          >
            {displayed || "No quotes yet — use the list icon to add some."}
          </div>
        )}
      </div>
      <div className="relative flex flex-col gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={uploading}
          onClick={() => {
            if (bgUrl) clearBackground();
            else fileInputRef.current?.click();
          }}
          title={bgUrl ? "Remove background" : "Set background image"}
          aria-label={bgUrl ? "Remove background" : "Set background image"}
        >
          {bgUrl ? <X className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
        </Button>
        {mode === "quote" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={shuffle}
              title="Shuffle quote"
              aria-label="Shuffle quote"
            >
              <Dices className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={openDialog}
              title="Edit quote collection"
              aria-label="Edit quote collection"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setModePersisted(mode === "text" ? "quote" : "text")}
          title={mode === "text" ? "Switch to quotes" : "Switch to free text"}
          aria-label={mode === "text" ? "Switch to quotes" : "Switch to free text"}
        >
          {mode === "text" ? <Quote className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Quote collection</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">One quote per line. Blank lines are ignored.</p>
            <Textarea
              value={dialogDraft}
              onChange={(e) => setDialogDraft(e.target.value)}
              className="min-h-[240px] text-sm"
              placeholder="Add one quote per line…"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveCollection}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}