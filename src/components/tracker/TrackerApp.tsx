import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addDays, format, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { StatsPanel } from "./StatsPanel";
import { SettingsDialog, type Habit } from "./SettingsDialog";
import { QuotePanel } from "./QuotePanel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemeColor } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Moon, Sun, LogOut, Plus, Minus, X, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { HabitIcon } from "./habitIcons";
import { playSound } from "@/lib/sound";
import { fireConfetti, fireMiniConfetti } from "@/lib/celebration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getWeekDays,
  getWeekStart,
  toDateKey,
} from "@/lib/week";
import {
  getDayBackground,
  useDayBackgrounds,
  type DayBackground,
} from "@/lib/dayBackgrounds";

type Todo = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
  sort_order: number;
};
type Entry = { id: string; habit_id: string; date: string; value: number };
type DayNote = { date: string; content: string };

type DayCount = 3 | 4 | 7;

function formatRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

const DAY_COUNT_KEY = "tracker.dayCount";
const VIEW_START_KEY = "tracker.viewStart";

function loadDayCount(): DayCount {
  if (typeof window === "undefined") return 7;
  const n = parseInt(localStorage.getItem(DAY_COUNT_KEY) ?? "7");
  return n === 3 || n === 4 ? n : 7;
}
function initialViewStart(count: DayCount): Date {
  const today = new Date();
  if (count === 7) return getWeekStart(today);
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

const THEME_COLORS: { value: ThemeColor; label: string; class: string }[] = [
  { value: "blue", label: "Blue", class: "bg-[oklch(0.58_0.19_258)]" },
  { value: "green", label: "Green", class: "bg-[oklch(0.55_0.18_150)]" },
  { value: "purple", label: "Purple", class: "bg-[oklch(0.58_0.2_285)]" },
  { value: "rose", label: "Rose", class: "bg-[oklch(0.58_0.2_20)]" },
  { value: "orange", label: "Orange", class: "bg-[oklch(0.6_0.19_45)]" },
  { value: "amber", label: "Amber", class: "bg-[oklch(0.62_0.17_80)]" },
  { value: "mono", label: "Black & white", class: "bg-[conic-gradient(oklch(0.25_0_0)_0deg_180deg,oklch(0.95_0_0)_180deg_360deg)]" },
];

function ThemeColorPicker({
  value,
  onChange,
}: {
  value: ThemeColor;
  onChange: (color: ThemeColor) => void;
}) {
  const active = THEME_COLORS.find((c) => c.value === value) ?? THEME_COLORS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Choose theme color" title="Theme color">
          <span className={cn("h-4 w-4 rounded-full border border-black/10", active.class)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {THEME_COLORS.map((c) => (
          <DropdownMenuItem
            key={c.value}
            onClick={() => onChange(c.value)}
            className="cursor-pointer gap-2"
          >
            <span className={cn("h-4 w-4 rounded-full border border-black/10", c.class)} />
            <span className="flex-1">{c.label}</span>
            {value === c.value && <span className="text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TrackerApp({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, toggle, themeColor, setThemeColor } = useTheme();
  const [dayCount, setDayCountState] = useState<DayCount>(() => loadDayCount());
  const [viewStart, setViewStart] = useState<Date>(() => {
    const count = loadDayCount();
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VIEW_START_KEY);
      if (stored) {
        const d = new Date(stored);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return initialViewStart(count);
  });

  function setDayCount(count: DayCount) {
    setDayCountState(count);
    if (typeof window !== "undefined") localStorage.setItem(DAY_COUNT_KEY, String(count));
    // Re-anchor: 7 snaps to week; 3/4 anchors to today when today falls outside range
    const today = new Date();
    if (count === 7) {
      setViewStart(getWeekStart(today));
    } else {
      setViewStart(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(VIEW_START_KEY, toDateKey(viewStart));
  }, [viewStart]);

  const days = useMemo(() => {
    if (dayCount === 7) return getWeekDays(viewStart);
    return Array.from({ length: dayCount }, (_, i) => addDays(viewStart, i));
  }, [viewStart, dayCount]);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollToToday = useCallback((behavior: ScrollBehavior = "smooth") => {
    const key = toDateKey(new Date());
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLElement>(`[data-date="${key}"]`);
      el?.scrollIntoView({ behavior, inline: "start", block: "nearest" });
    });
  }, []);

  function goToday() {
    const t = new Date();
    setViewStart(dayCount === 7 ? getWeekStart(t) : new Date(t.getFullYear(), t.getMonth(), t.getDate()));
    scrollToToday();
  }

  // On first load, bring today's column into view (matters on mobile)
  useEffect(() => {
    scrollToToday("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startKey = toDateKey(days[0]);
  const endKey = toDateKey(days[days.length - 1]);

  const todosKey = ["todos", userId, startKey];
  const entriesKey = ["entries", userId, startKey];
  const notesKey = ["notes", userId, startKey];

  const todosQuery = useQuery({
    queryKey: todosKey,
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .gte("date", startKey)
        .lte("date", endKey)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Todo[];
    },
  });

  const habitsQuery = useQuery({
    queryKey: ["habits", userId],
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Habit[];
    },
  });

  const entriesQuery = useQuery({
    queryKey: entriesKey,
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("habit_entries")
        .select("id, habit_id, date, value")
        .gte("date", startKey)
        .lte("date", endKey);
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const notesQuery = useQuery({
    queryKey: notesKey,
    queryFn: async (): Promise<DayNote[]> => {
      const { data, error } = await supabase
        .from("day_notes")
        .select("date, content")
        .gte("date", startKey)
        .lte("date", endKey);
      if (error) throw error;
      return (data ?? []) as DayNote[];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        await supabase.from("settings").insert({ user_id: userId, weekly_task_goal: 20 });
        return { user_id: userId, weekly_task_goal: 20 };
      }
      return data;
    },
  });

  const todos = todosQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const entries = entriesQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const tasksGoal = settingsQuery.data?.weekly_task_goal ?? 20;

  function setTodos(fn: (prev: Todo[]) => Todo[]) {
    qc.setQueryData<Todo[]>(todosKey, (prev) => fn(prev ?? []));
  }
  function setEntries(fn: (prev: Entry[]) => Entry[]) {
    qc.setQueryData<Entry[]>(entriesKey, (prev) => fn(prev ?? []));
  }

  const addTodo = useMutation({
    mutationFn: async ({ title, date }: { title: string; date: string }) => {
      const dayTodos = (qc.getQueryData<Todo[]>(todosKey) ?? []).filter((t) => t.date === date);
      const sort_order = dayTodos.length;
      const { data, error } = await supabase
        .from("todos")
        .insert({ user_id: userId, title, date, sort_order })
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: (row, vars) => {
      setTodos((prev) => {
        const withoutTemp = prev.filter(
          (t) => !(t.id.startsWith("tmp-") && t.date === vars.date && t.title === vars.title),
        );
        return [...withoutTemp, row];
      });
    },
    onError: () => {
      toast.error("Couldn't add todo");
      qc.invalidateQueries({ queryKey: todosKey });
    },
  });

  function handleAddTodo(title: string, date: string) {
    if (!title.trim()) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    const dayTodos = todos.filter((t) => t.date === date);
    const tmp: Todo = {
      id: tempId,
      user_id: userId,
      title,
      date,
      completed: false,
      sort_order: dayTodos.length,
    };
    setTodos((prev) => [...prev, tmp]);
    addTodo.mutate({ title, date });
  }

  const updateTodo = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Todo> }) => {
      const { error } = await supabase.from("todos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast.error("Save failed");
      qc.invalidateQueries({ queryKey: todosKey });
    },
  });
  const deleteTodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast.error("Delete failed");
      qc.invalidateQueries({ queryKey: todosKey });
    },
  });

  function handleToggle(t: Todo) {
    const nextCompleted = !t.completed;
    const prevDone = todos.filter((x) => x.completed).length;
    const nextDone = prevDone + (nextCompleted ? 1 : -1);
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: nextCompleted } : x)));
    if (!t.id.startsWith("tmp-")) updateTodo.mutate({ id: t.id, patch: { completed: nextCompleted } });
    if (nextCompleted) {
      playSound("complete");
      fireMiniConfetti();
      if (tasksGoal > 0 && prevDone < tasksGoal && nextDone >= tasksGoal) {
        fireConfetti();
        setGoalCelebration(true);
        playSound("goal");
      }
    } else {
      playSound("uncomplete");
    }
  }
  function handleEditTitle(t: Todo, title: string) {
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, title } : x)));
    if (!t.id.startsWith("tmp-")) updateTodo.mutate({ id: t.id, patch: { title } });
  }
  function handleDelete(t: Todo) {
    setTodos((prev) => prev.filter((x) => x.id !== t.id));
    if (!t.id.startsWith("tmp-")) deleteTodo.mutate(t.id);
    playSound("delete");
  }

  const [goalCelebration, setGoalCelebration] = useState(false);

  const sensors = useSensors(
    // Mouse drags immediately after a small move; touch requires a long-press so
    // that vertical swipes stay scrolls instead of turning into drags.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  // Last known pointer position during a drag; used to decide whether a drop
  // lands above or below the hovered row.
  const pointerYRef = useRef<number | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    // Confirm the long-press actually picked the item up.
    navigator.vibrate?.(15);
  }

  // Prefer whatever is under the pointer so empty day columns are valid drop
  // targets (closestCorners alone favours nearby task rows in the source day).
  function collisionDetection(args: Parameters<typeof closestCorners>[0]) {
    pointerYRef.current = args.pointerCoordinates?.y ?? null;
    const pointer = pointerWithin(args);
    const candidates = pointer.length ? pointer : rectIntersection(args);
    if (!candidates.length) return closestCorners(args);
    const item = candidates.find((c) => !String(c.id).startsWith("day-"));
    return item ? [item] : candidates;
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTodo = todos.find((t) => t.id === active.id);
    if (!activeTodo) return;

    const overId = String(over.id);
    let targetDate: string;
    let overTodo: Todo | undefined;
    if (overId.startsWith("day-")) {
      targetDate = overId.slice(4);
    } else {
      overTodo = todos.find((t) => t.id === overId);
      if (!overTodo) return;
      targetDate = overTodo.date;
    }

    // Mirror dnd-kit's own sortable preview so the released card lands exactly
    // where the gap was shown.
    let newTargetList: Todo[];
    if (overTodo && targetDate === activeTodo.date) {
      const dayList = todos
        .filter((t) => t.date === targetDate)
        .sort((a, b) => a.sort_order - b.sort_order);
      const from = dayList.findIndex((t) => t.id === activeTodo.id);
      const to = dayList.findIndex((t) => t.id === overTodo!.id);
      newTargetList = [...dayList];
      if (from >= 0 && to >= 0) {
        newTargetList.splice(to, 0, newTargetList.splice(from, 1)[0]);
      }
    } else {
      const targetList = todos
        .filter((t) => t.date === targetDate && t.id !== activeTodo.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const idx = overTodo ? targetList.findIndex((t) => t.id === overTodo!.id) : -1;
      const finalIndex = idx >= 0 ? idx : targetList.length;
      newTargetList = [
        ...targetList.slice(0, finalIndex),
        { ...activeTodo, date: targetDate },
        ...targetList.slice(finalIndex),
      ];
    }
    const updates = newTargetList.map((t, i) => ({ id: t.id, sort_order: i, date: targetDate }));

    setTodos((prev) =>
      prev.map((t) => {
        const u = updates.find((x) => x.id === t.id);
        return u ? { ...t, sort_order: u.sort_order, date: u.date } : t;
      }),
    );

    (async () => {
      for (const u of updates) {
        if (u.id.startsWith("tmp-")) continue;
        await supabase.from("todos").update({ sort_order: u.sort_order, date: u.date }).eq("id", u.id);
      }
    })().catch(() => {
      toast.error("Reorder failed");
      qc.invalidateQueries({ queryKey: todosKey });
    });
  }

  const createHabit = useMutation({
    mutationFn: async ({ name, weekly_goal, unit, icon }: { name: string; weekly_goal: number; unit: string; icon: string }) => {
      const { error } = await supabase
        .from("habits")
        .insert({ user_id: userId, name, weekly_goal, unit, icon, sort_order: habits.length });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits", userId] }),
  });
  const updateHabit = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Habit> }) => {
      const { error } = await supabase.from("habits").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["habits", userId] });
      const prev = qc.getQueryData<Habit[]>(["habits", userId]);
      qc.setQueryData<Habit[]>(["habits", userId], (p) => (p ?? []).map((h) => (h.id === id ? { ...h, ...patch } : h)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["habits", userId], ctx.prev);
    },
  });
  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits", userId] });
      qc.invalidateQueries({ queryKey: entriesKey });
    },
  });

  const upsertEntry = useMutation({
    mutationFn: async ({ habit_id, date, value }: { habit_id: string; date: string; value: number }) => {
      const { data, error } = await supabase
        .from("habit_entries")
        .upsert({ user_id: userId, habit_id, date, value }, { onConflict: "habit_id,date" })
        .select()
        .single();
      if (error) throw error;
      return data as Entry;
    },
    onSuccess: (row) => {
      setEntries((prev) => {
        const filtered = prev.filter((e) => !(e.habit_id === row.habit_id && e.date === row.date));
        return [...filtered, row];
      });
    },
    onError: () => {
      toast.error("Save failed");
      qc.invalidateQueries({ queryKey: entriesKey });
    },
  });

  function handleEntryChange(habitId: string, date: string, valueStr: string) {
    const value = parseFloat(valueStr) || 0;
    setEntries((prev) => {
      const filtered = prev.filter((e) => !(e.habit_id === habitId && e.date === date));
      return [...filtered, { id: `tmp-${habitId}-${date}`, habit_id: habitId, date, value }];
    });
    upsertEntry.mutate({ habit_id: habitId, date, value });
  }

  const upsertNote = useMutation({
    mutationFn: async ({ date, content }: { date: string; content: string }) => {
      const { error } = await supabase
        .from("day_notes")
        .upsert({ user_id: userId, date, content }, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onError: () => {
      toast.error("Note save failed");
      qc.invalidateQueries({ queryKey: notesKey });
    },
  });

  function handleNoteChange(date: string, content: string) {
    qc.setQueryData<DayNote[]>(notesKey, (prev) => {
      const list = prev ?? [];
      const filtered = list.filter((n) => n.date !== date);
      return [...filtered, { date, content }];
    });
    upsertNote.mutate({ date, content });
  }

  const setTasksGoal = useMutation({
    mutationFn: async (goal: number) => {
      const { error } = await supabase
        .from("settings")
        .upsert({ user_id: userId, weekly_task_goal: goal });
      if (error) throw error;
    },
    onMutate: async (goal) => {
      await qc.cancelQueries({ queryKey: ["settings", userId] });
      const prev = qc.getQueryData(["settings", userId]);
      qc.setQueryData(["settings", userId], { user_id: userId, weekly_task_goal: goal });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["settings", userId], ctx.prev);
    },
  });

  const tasksDone = todos.filter((t) => t.completed).length;
  const habitStats = habits.map((h) => {
    const sum = entries.filter((e) => e.habit_id === h.id).reduce((s, e) => s + Number(e.value), 0);
    return { id: h.id, name: h.name, sum, goal: h.weekly_goal, unit: h.unit, icon: h.icon };
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const today = new Date();
  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;
  const dayBackgrounds = useDayBackgrounds();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-3 space-y-3">
          {/* Below md the date controls drop to their own full-width row so the
              icon cluster never wraps a single button onto a line of its own. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2 min-w-0 order-1">
              <div className="h-7 w-7 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">W</div>
              <h1 className="text-base font-medium tracking-tight whitespace-nowrap">Weekly Tracker</h1>
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden lg:inline">
                {formatRange(days[0], days[days.length - 1])}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 w-full md:w-auto justify-between md:justify-end order-3 md:order-2 md:ml-auto">
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" onClick={() => setViewStart(addDays(viewStart, -dayCount))} aria-label="Previous span">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewStart(addDays(viewStart, -1))} aria-label="Previous day">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewStart(addDays(viewStart, 1))} aria-label="Next day">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewStart(addDays(viewStart, dayCount))} aria-label="Next span">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-1"
                  onClick={goToday}
                >
                  Today
                </Button>
              </div>
              <div className="flex items-center rounded-md border border-border overflow-hidden ml-2">
                {([3, 4, 7] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setDayCount(n)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium transition-colors",
                      dayCount === n
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    aria-pressed={dayCount === n}
                    aria-label={`Show ${n} days`}
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 ml-auto md:ml-0 order-2 md:order-3">
              <SettingsDialog
                habits={habits}
                tasksGoal={tasksGoal}
                onCreateHabit={(input) => createHabit.mutate(input)}
                onUpdateHabit={(id, patch) => updateHabit.mutate({ id, patch })}
                onDeleteHabit={(id) => deleteHabit.mutate(id)}
                onSetTasksGoal={(g) => setTasksGoal.mutate(g)}
              />
              <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch gap-3">
            <QuotePanel weekKey={toDateKey(getWeekStart(days[0]))} />
            <StatsPanel
              tasksDone={tasksDone}
              tasksGoal={tasksGoal}
              habitStats={habitStats}
              onSetTasksGoal={(g) => setTasksGoal.mutate(g)}
            />
          </div>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="mx-auto max-w-[1600px] px-2 sm:px-4 py-4">
          <div
            ref={gridRef}
            className="flex md:grid gap-px bg-border rounded-lg overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none -mx-2 sm:mx-0 px-2 sm:px-0 scroll-px-2 sm:scroll-px-0"
            style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
          >
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const isToday = isSameDay(day, today);
              const dayTodos = todos
                .filter((t) => t.date === dateKey)
                .sort((a, b) => a.sort_order - b.sort_order);
              return (
                <DayColumn
                  key={dateKey}
                  day={day}
                  label={format(day, "EEE")}
                  isToday={isToday}
                  background={getDayBackground(dayBackgrounds[day.getDay()])}
                  todos={dayTodos}
                  habits={habits}
                  entries={entries}
                  onAdd={(title) => handleAddTodo(title, dateKey)}
                  onToggle={handleToggle}
                  onEdit={handleEditTitle}
                  onDelete={handleDelete}
                  onEntry={handleEntryChange}
                  note={notes.find((n) => n.date === dateKey)?.content ?? ""}
                  onNoteChange={(v) => handleNoteChange(dateKey, v)}
                />
              );
            })}
          </div>
        </main>
        <DragOverlay>
          {activeTodo ? (
            <div className="rounded-md border border-border bg-card px-2 py-1.5 shadow-lg text-sm">
              {activeTodo.title || "Untitled"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={goalCelebration} onOpenChange={setGoalCelebration}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">🎉 Weekly goal reached!</DialogTitle>
            <DialogDescription className="text-center">
              You've completed {tasksGoal} {tasksGoal === 1 ? "task" : "tasks"} this week. Nice work.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setGoalCelebration(false)}>Keep going</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayColumn({
  day,
  label,
  isToday,
  background,
  todos,
  habits,
  entries,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onEntry,
  note,
  onNoteChange,
}: {
  day: Date;
  label: string;
  isToday: boolean;
  background: DayBackground | null;
  todos: Todo[];
  habits: Habit[];
  entries: Entry[];
  onAdd: (title: string) => void;
  onToggle: (t: Todo) => void;
  onEdit: (t: Todo, title: string) => void;
  onDelete: (t: Todo) => void;
  onEntry: (habitId: string, date: string, value: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
}) {
  const dateKey = toDateKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function confirmAdd() {
    if (draft.trim()) onAdd(draft);
    setDraft("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      data-date={dateKey}
      className={cn(
        "bg-background w-[88vw] max-w-[360px] shrink-0 md:w-auto md:max-w-none md:min-w-0 md:flex-1 snap-start flex flex-col group/col",
        isOver && "bg-primary-soft/40",
      )}
    >
      <div
        className={cn(
          "relative px-3 py-2 border-b border-border sticky top-0 bg-background z-10 overflow-hidden",
          isToday && !background && "bg-today",
        )}
        style={
          background
            ? {
                backgroundImage: `url(${background.src})`,
                backgroundSize: "cover",
                backgroundPosition: background.position ?? "center",
              }
            : undefined
        }
      >
        {/* Scrim keeps the label legible over both light and dark tiles. */}
        {background && <div className="absolute inset-0 bg-background/55" aria-hidden />}
        <div className="relative">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={cn("text-lg font-medium tabular-nums", isToday && "text-primary")}>
            {day.getDate()}
          </div>
        </div>
      </div>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy} id={`day-${dateKey}`}>
        <div className="px-2 py-2 space-y-0.5 min-h-[140px]">
          {todos.map((t) => (
            <TodoRow key={t.id} todo={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {adding ? (
            <div className="flex items-center gap-1.5 px-1.5 py-1">
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={confirmAdd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAdd();
                  if (e.key === "Escape") { setDraft(""); setAdding(false); }
                }}
                placeholder="New task…"
                className="h-7 text-sm"
              />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground opacity-0 group-hover/col:opacity-100 focus:opacity-100 transition-opacity"
            >
              <Plus className="h-3 w-3" /> Add a task…
            </button>
          )}
          {todos.length === 0 && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="w-full text-left px-2 py-1 text-xs text-muted-foreground/60 italic"
            >
              Add a task…
            </button>
          )}
        </div>
      </SortableContext>

      <div className="mt-auto">
        {habits.length > 0 && (
          <div className="border-t border-border px-2 py-2 space-y-1">
            {habits.map((h) => {
            const entry = entries.find((e) => e.habit_id === h.id && e.date === dateKey);
            return (
              <div key={h.id} className="flex items-center gap-2">
                <div
                  className="text-[11px] text-muted-foreground truncate flex-1 flex items-center gap-1"
                  title={h.unit ? `${h.name} (${h.unit})` : h.name}
                >
                  {h.icon && <HabitIcon name={h.icon} className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{h.name}</span>
                </div>
                <HabitInput
                  initialValue={entry ? String(entry.value) : ""}
                  onCommit={(v) => onEntry(h.id, dateKey, v)}
                />
              </div>
            );
            })}
          </div>
        )}
        <DayNoteArea value={note} onCommit={onNoteChange} title={format(day, "EEEE, MMM d")} />
      </div>
    </div>
  );
}

function DayNoteArea({ value, onCommit, title }: { value: string; onCommit: (v: string) => void; title: string }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => setDraft(value), [value]);

  const commit = (v: string) => { if (v !== value) onCommit(v); };

  return (
    <div className="border-t border-border px-2 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</div>
        <button
          type="button"
          onClick={() => setFocused(true)}
          title="Edit full screen"
          aria-label="Edit note full screen"
          className="text-muted-foreground/60 hover:text-foreground opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        placeholder="Add a note…"
        className="w-full min-h-[200px] text-xs resize-none bg-transparent border-0 outline-none p-0 placeholder:text-muted-foreground/50 focus:outline-none overflow-y-auto scrollbar-subtle"
      />

      <Dialog
        open={focused}
        onOpenChange={(open) => {
          if (!open) commit(draft);
          setFocused(open);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Notes — {title}</DialogTitle>
            <DialogDescription className="sr-only">Edit the note for this day</DialogDescription>
          </DialogHeader>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note…"
            className="w-full h-[60vh] text-sm resize-none bg-transparent border-0 outline-none p-0 placeholder:text-muted-foreground/50 focus:outline-none overflow-y-auto scrollbar-subtle"
          />
          <DialogFooter>
            <Button size="sm" onClick={() => { commit(draft); setFocused(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HabitInput({ initialValue, onCommit }: { initialValue: string; onCommit: (v: string) => void }) {
  const [val, setVal] = useState(initialValue);
  useEffect(() => setVal(initialValue), [initialValue]);
  const num = val === "" ? 0 : Number(val) || 0;
  const step = (delta: number) => {
    const next = Math.max(0, num + delta);
    const nextStr = next === 0 && val === "" ? "" : String(next);
    setVal(nextStr);
    if (nextStr !== initialValue) onCommit(nextStr);
  };
  const filled = val !== "" && num > 0;
  return (
    <div
      className={cn(
        "group/hi inline-flex items-center h-7 rounded-full border transition-colors",
        filled
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={num <= 0}
        aria-label="Decrease"
        className="h-7 w-6 inline-flex items-center justify-center rounded-l-full opacity-0 group-hover/hi:opacity-100 focus-within:opacity-100 disabled:opacity-0 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => { if (val !== initialValue) onCommit(val); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          else if (e.key === "ArrowUp") { e.preventDefault(); step(1); }
          else if (e.key === "ArrowDown") { e.preventDefault(); step(-1); }
        }}
        onFocus={(e) => e.currentTarget.select()}
        placeholder="0"
        className="w-6 h-7 bg-transparent text-center text-xs font-medium tabular-nums outline-none placeholder:text-muted-foreground/50 placeholder:font-normal"
      />
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Increase"
        className="h-7 w-6 inline-flex items-center justify-center rounded-r-full opacity-0 group-hover/hi:opacity-100 focus-within:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  onToggle: (t: Todo) => void;
  onEdit: (t: Todo, title: string) => void;
  onDelete: (t: Todo) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => setDraft(todo.title), [todo.title]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editing ? {} : listeners)}
      className={cn(
        "group flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted/60 transition-colors touch-manipulation select-none",
        isDragging && "shadow-sm ring-1 ring-primary/40",
        editing ? "cursor-text" : "cursor-grab active:cursor-grabbing",
      )}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo)}
        className="h-3.5 w-3.5"
      />
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== todo.title) onEdit(todo, draft); setEditing(false); }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") { setDraft(todo.title); setEditing(false); }
          }}
          className="h-6 text-sm px-1 flex-1"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 text-left text-sm truncate transition-colors",
            todo.completed && "line-through text-muted-foreground",
          )}
        >
          {todo.title || <span className="text-muted-foreground italic">Untitled</span>}
        </button>
      )}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        aria-label="Delete"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              {todo.title
                ? <>“{todo.title}” will be permanently removed.</>
                : <>This task will be permanently removed.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(todo); setConfirmOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}