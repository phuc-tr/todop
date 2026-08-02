import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Gear, Trash, Plus, Smiley } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { HABIT_ICON_KEYS, HABIT_ICONS, HabitIcon } from "./habitIcons";
import { cn } from "@/lib/utils";
import { getSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { ChangePassword } from "./ChangePassword";
import { DAY_LABELS } from "@/lib/week";
import {
  BACKGROUND_SETS,
  WEEKDAY_ORDER,
  clearDayBackgrounds,
  getDayBackground,
  setDayBackground,
  useDayBackgrounds,
} from "@/lib/dayBackgrounds";

export type Habit = {
  id: string;
  name: string;
  weekly_goal: number;
  unit: string;
  icon: string;
};

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const Current = value ? HABIT_ICONS[value] : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Choose icon"
        >
          {Current ? (
            <Current className="h-4 w-4" />
          ) : (
            <Smiley className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center text-[10px] text-muted-foreground hover:bg-muted",
              !value && "ring-2 ring-ring",
            )}
            aria-label="No icon"
          >
            None
          </button>
          {HABIT_ICON_KEYS.map((key) => {
            const Icon = HABIT_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted",
                  value === key && "bg-primary/10 text-primary ring-2 ring-ring",
                )}
                aria-label={key}
                title={key}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DayBackgroundPicker() {
  const map = useDayBackgrounds();
  const anySet = WEEKDAY_ORDER.some((d) => map[d]);
  // The grid lives inline rather than in a Popover: a popover portals outside
  // the dialog, where the dialog's scroll lock eats wheel events on it.
  const [openDay, setOpenDay] = useState<number | null>(null);
  const openSelected = openDay === null ? null : getDayBackground(map[openDay]);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Day backgrounds</Label>
          <p className="text-[11px] text-muted-foreground">
            An image behind each weekday's header.
          </p>
        </div>
        {anySet && (
          <Button type="button" variant="ghost" size="sm" onClick={clearDayBackgrounds}>
            Reset
          </Button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((weekday, i) => {
          const selected = getDayBackground(map[weekday]);
          return (
            <button
              key={weekday}
              type="button"
              onClick={() => setOpenDay(openDay === weekday ? null : weekday)}
              className="flex flex-col items-center gap-1 rounded-md p-1 hover:bg-muted"
              aria-expanded={openDay === weekday}
              aria-label={`Background for ${DAY_LABELS[i]}`}
            >
              <span
                className={cn(
                  "h-10 w-10 rounded-md border border-border bg-cover bg-center flex items-center justify-center text-[9px] text-muted-foreground",
                  !selected && "bg-muted",
                  openDay === weekday && "ring-2 ring-ring",
                )}
                style={selected ? { backgroundImage: `url(${selected.src})` } : undefined}
              >
                {!selected && "None"}
              </span>
              <span className="text-[10px] text-muted-foreground">{DAY_LABELS[i]}</span>
            </button>
          );
        })}
      </div>
      {openDay !== null && (
        <div className="mt-2 rounded-lg border border-border p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium">
              {DAY_LABELS[WEEKDAY_ORDER.indexOf(openDay)]}
            </span>
            <button
              type="button"
              onClick={() => setDayBackground(openDay, null)}
              className={cn(
                "rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted",
                !openSelected && "ring-2 ring-ring",
              )}
            >
              None
            </button>
          </div>
          {BACKGROUND_SETS.map((set) => (
            <div key={set.id} className="mb-2 last:mb-0">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {set.label}
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {set.items.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setDayBackground(openDay, bg.id)}
                    className={cn(
                      "aspect-square w-full rounded-md border border-border bg-cover bg-center hover:opacity-80",
                      openSelected?.id === bg.id && "ring-2 ring-ring",
                    )}
                    style={{ backgroundImage: `url(${bg.src})` }}
                    title={bg.label}
                    aria-label={bg.label}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsDialog({
  habits,
  tasksGoal,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  onSetTasksGoal,
}: {
  habits: Habit[];
  tasksGoal: number;
  onCreateHabit: (input: { name: string; weekly_goal: number; unit: string; icon: string }) => void;
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
  onDeleteHabit: (id: string) => void;
  onSetTasksGoal: (goal: number) => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState("");
  const [icon, setIcon] = useState("");
  const [sound, setSound] = useState<boolean>(() => getSoundEnabled());
  useEffect(() => {
    const handler = (e: Event) => setSound((e as CustomEvent<boolean>).detail);
    window.addEventListener("tracker:sound-changed", handler);
    return () => window.removeEventListener("tracker:sound-changed", handler);
  }, []);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Gear className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scrollbar-subtle">
        <DialogHeader>
          <DialogTitle className="font-editorial text-2xl">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Weekly task goal</Label>
            <Input
              type="number"
              value={tasksGoal}
              onChange={(e) => onSetTasksGoal(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Sound effects</Label>
              <p className="text-[11px] text-muted-foreground">
                Play a chime on completion and delete.
              </p>
            </div>
            <Switch
              checked={sound}
              onCheckedChange={(v) => {
                setSound(v);
                setSoundEnabled(v);
              }}
              aria-label="Toggle sound effects"
            />
          </div>
          <DayBackgroundPicker />
          <div className="border-t border-border pt-4">
            <ChangePassword />
          </div>
          <div>
            <Label className="text-xs">Habits</Label>
            <div className="mt-2 space-y-2">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  <IconPicker
                    value={h.icon ?? ""}
                    onChange={(v) => onUpdateHabit(h.id, { icon: v })}
                  />
                  <Input
                    value={h.name}
                    onChange={(e) => onUpdateHabit(h.id, { name: e.target.value })}
                    className="flex-1"
                    placeholder="Name"
                  />
                  <Input
                    value={h.unit ?? ""}
                    onChange={(e) => onUpdateHabit(h.id, { unit: e.target.value })}
                    className="w-20"
                    placeholder="Unit"
                  />
                  <Input
                    type="number"
                    value={h.weekly_goal}
                    onChange={(e) =>
                      onUpdateHabit(h.id, { weekly_goal: parseInt(e.target.value) || 0 })
                    }
                    className="w-16"
                    placeholder="Goal"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteHabit(h.id)}
                    aria-label="Delete habit"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-xs text-muted-foreground">No habits yet.</p>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <IconPicker value={icon} onChange={setIcon} />
              <Input
                placeholder="Name (e.g. LeetCode)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-20"
              />
              <Input
                type="number"
                placeholder="Goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-16"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!name.trim()) return;
                  onCreateHabit({
                    name: name.trim(),
                    weekly_goal: parseInt(goal) || 0,
                    unit: unit.trim(),
                    icon,
                  });
                  setName("");
                  setGoal("");
                  setUnit("");
                  setIcon("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
