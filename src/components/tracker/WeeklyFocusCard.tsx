import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateWeeklyBanner } from "./weekly-focus.functions";
import { cn } from "@/lib/utils";
import { Pencil, Image, Wand2, Trash2, Upload, X, Check } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "weekly-banners";

export type WeeklyFocus = {
  header: string;
  body: string;
  bannerUrl: string | null;
};

export function WeeklyFocusCard({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: WeeklyFocus;
  onChange: (next: WeeklyFocus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const generateFn = useServerFn(generateWeeklyBanner);

  const commit = useCallback(
    (next: Partial<WeeklyFocus>) => {
      onChange({ ...value, ...next });
    },
    [onChange, value],
  );

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setBusy(true);
    try {
      const fileName = `${userId}/${crypto.randomUUID()}.${file.name.split(".").pop() || "png"}`;
      const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);
      commit({ bannerUrl: data?.signedUrl ?? null });
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    const text = prompt.trim();
    if (!text) return;
    setBusy(true);
    try {
      const { url } = await generateFn({ data: { prompt: text, userId } });
      if (url) commit({ bannerUrl: url });
      setGenerateOpen(false);
      setPrompt("");
    } catch (e) {
      toast.error("Image generation failed");
    } finally {
      setBusy(false);
    }
  }

  function handleRemoveBanner() {
    commit({ bannerUrl: null });
  }

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function saveEdit() {
    onChange({
      header: draft.header.trim() || "Weekly Focus",
      body: draft.body,
      bannerUrl: draft.bannerUrl,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <Input
            value={draft.header}
            onChange={(e) => setDraft((d) => ({ ...d, header: e.target.value }))}
            className="h-7 text-sm font-medium"
            placeholder="Weekly Focus"
          />
        ) : (
          <h2 className="text-sm font-semibold leading-tight truncate">{value.header}</h2>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit} aria-label="Save">
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit} aria-label="Cancel">
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit} aria-label="Edit weekly focus">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {value.bannerUrl && (
        <div className="relative group/banner rounded-md overflow-hidden border border-border aspect-[3/1] bg-muted">
          <img
            src={value.bannerUrl}
            alt="Weekly banner"
            className="h-full w-full object-cover"
          />
          {editing && (
            <button
              onClick={handleRemoveBanner}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover/banner:opacity-100 transition-opacity"
              aria-label="Remove banner"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {editing ? (
        <>
          <Textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder="Add your weekly focus, goals, or notes…"
            className="min-h-[80px] text-sm resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-3 w-3" /> Upload banner
            </Button>
            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={busy}>
                  <Wand2 className="h-3 w-3" /> Generate
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-sm">Generate banner image</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the banner image you want…"
                  className="min-h-[100px] text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setGenerateOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleGenerate} disabled={!prompt.trim() || busy}>
                    Generate
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      ) : (
        <p
          className={cn(
            "text-sm text-muted-foreground whitespace-pre-wrap",
            !value.body && "italic opacity-60",
          )}
        >
          {value.body || "Tap the pencil to add your weekly focus, goals, or notes."}
        </p>
      )}
    </div>
  );
}
