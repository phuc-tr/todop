import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Dices, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLECTION_KEY = "tracker.quotes.collection";
const CUSTOM_PREFIX = "tracker.quotes.custom.";
const DISPLAYED_PREFIX = "tracker.quotes.displayed.";

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
  const [collection, setCollection] = useState<string[]>(() => loadCollection());
  const [custom, setCustom] = useState<string>("");
  const [displayed, setDisplayed] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDraft, setDialogDraft] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedCustom = localStorage.getItem(customKey) ?? "";
    setCustom(savedCustom);
    if (savedCustom.trim()) {
      setDisplayed(savedCustom);
      return;
    }
    const savedDisplayed = localStorage.getItem(displayedKey);
    if (savedDisplayed) {
      setDisplayed(savedDisplayed);
    } else {
      const pick = pickRandom(collection);
      setDisplayed(pick);
      if (pick) localStorage.setItem(displayedKey, pick);
    }
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
    if (value.trim()) {
      setDisplayed(value);
    } else {
      const pick = pickRandom(collection);
      setDisplayed(pick);
      if (typeof window !== "undefined" && pick) localStorage.setItem(displayedKey, pick);
    }
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
    if (!custom.trim()) {
      const pick = pickRandom(next);
      setDisplayed(pick);
      if (typeof window !== "undefined" && pick) localStorage.setItem(displayedKey, pick);
    }
    setDialogOpen(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm w-full h-full sm:flex-1 flex items-stretch gap-2 group">
      <div className="flex-1 min-w-0 flex flex-col">
        {editing ? (
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              saveCustom(draft);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditing(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            placeholder="Write anything… (⌘/Ctrl+Enter to save, Esc to cancel)"
            className="flex-1 min-h-0 text-sm resize-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(custom);
              setEditing(true);
            }}
            title="Click to write your own"
            className={cn(
              "flex-1 w-full text-left text-sm leading-snug rounded px-1 -mx-1 py-0.5 hover:bg-muted/50 transition-colors",
              custom.trim() ? "text-foreground" : "text-muted-foreground italic",
            )}
          >
            {displayed || "Click to write something, or shuffle for a quote →"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            if (custom.trim()) saveCustom("");
            else shuffle();
          }}
          title={custom.trim() ? "Clear custom text and shuffle" : "Shuffle quote"}
          aria-label="Shuffle quote"
        >
          <Dices className="h-3.5 w-3.5" />
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={openDialog}
              title="Edit quote collection"
              aria-label="Edit quote collection"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
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