import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { motion, useSpring } from "motion/react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { BrandMark } from "./BrandMark";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RemoveIcon from "@mui/icons-material/Remove";
import { supabase } from "@/integrations/supabase/client";
import { StatsPanel } from "./StatsPanel";
import { SettingsDialog, type Habit } from "./SettingsDialog";
import { QuotePanel } from "./QuotePanel";
import { useAppTheme } from "@/lib/theme";
import { ACCENTS, ACCENT_KEYS, type ThemeColor } from "@/lib/muiTheme";
import { toast } from "@/lib/toast";
import { HabitIcon } from "./habitIcons";
import { playSound } from "@/lib/sound";
import { fireConfetti, fireMiniConfetti } from "@/lib/celebration";
import { getWeekDays, getWeekStart, toDateKey } from "@/lib/week";
import { getDayBackground, useDayBackgrounds, type DayBackground } from "@/lib/dayBackgrounds";
import { fetchLinkPreview } from "@/lib/linkPreview.functions";

type Todo = {
  id: string;
  user_id: string;
  title: string;
  /** null = unscheduled (lives in the backlog column) */
  date: string | null;
  completed: boolean;
  sort_order: number;
};
type Entry = { id: string; habit_id: string; date: string; value: number };
type DayNote = { date: string; content: string };

type DayCount = 3 | 5 | 7;

function formatRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

// Column widths are flex-grow weights driven by a spring, so expanding one day
// and shrinking the rest is a single smooth motion (and interruptible mid-flight).
const MotionBox = motion.create(Box);
const EXPANDED_GROW = 3;
const GROW_SPRING = { stiffness: 700, damping: 44, mass: 0.4 } as const;

const DAY_COUNT_KEY = "tracker.dayCount";
const VIEW_START_KEY = "tracker.viewStart";

function loadDayCount(): DayCount {
  if (typeof window === "undefined") return 7;
  const n = parseInt(localStorage.getItem(DAY_COUNT_KEY) ?? "7");
  return n === 3 || n === 5 ? n : 7;
}
function initialViewStart(count: DayCount): Date {
  const today = new Date();
  if (count === 7) return getWeekStart(today);
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function Swatch({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: 1,
        borderColor: "rgba(0,0,0,0.15)",
        flexShrink: 0,
      }}
    />
  );
}

function ThemeColorPicker({
  value,
  onChange,
}: {
  value: ThemeColor;
  onChange: (color: ThemeColor) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Theme colour">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Choose theme colour">
          <PaletteOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {ACCENT_KEYS.map((key) => (
          <MenuItem
            key={key}
            selected={value === key}
            onClick={() => {
              onChange(key);
              setAnchor(null);
            }}
            sx={{ gap: 1.5, minWidth: 180 }}
          >
            <Swatch color={ACCENTS[key].swatch} />
            {ACCENTS[key].label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function TrackerApp({ userId, isGuest = false }: { userId: string; isGuest?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { mounted, mode, toggle, themeColor, setThemeColor } = useAppTheme();
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

  // Clicking a day header widens that column and shrinks the rest evenly.
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const expanded =
    expandedDate && days.some((d) => toDateKey(d) === expandedDate) ? expandedDate : null;

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
    setViewStart(
      dayCount === 7 ? getWeekStart(t) : new Date(t.getFullYear(), t.getMonth(), t.getDate()),
    );
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
    if (!t.id.startsWith("tmp-"))
      updateTodo.mutate({ id: t.id, patch: { completed: nextCompleted } });
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

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    // Confirm the long-press actually picked the item up.
    navigator.vibrate?.(15);
  }

  // Prefer whatever is under the pointer so empty day columns are valid drop
  // targets (closestCorners alone favours nearby task rows in the source day).
  function collisionDetection(args: Parameters<typeof closestCorners>[0]) {
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
        await supabase
          .from("todos")
          .update({ sort_order: u.sort_order, date: u.date })
          .eq("id", u.id);
      }
    })().catch(() => {
      toast.error("Reorder failed");
      qc.invalidateQueries({ queryKey: todosKey });
    });
  }

  const createHabit = useMutation({
    mutationFn: async ({
      name,
      weekly_goal,
      unit,
      icon,
    }: {
      name: string;
      weekly_goal: number;
      unit: string;
      icon: string;
    }) => {
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
      qc.setQueryData<Habit[]>(["habits", userId], (p) =>
        (p ?? []).map((h) => (h.id === id ? { ...h, ...patch } : h)),
      );
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
    mutationFn: async ({
      habit_id,
      date,
      value,
    }: {
      habit_id: string;
      date: string;
      value: number;
    }) => {
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
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <AppBar
        position="static"
        sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}
      >
        <Box sx={{ mx: "auto", width: "100%", maxWidth: 1600, px: { xs: 2, sm: 3 }, py: 1.5 }}>
          {/* Below md the date controls drop to their own full-width row so the
              icon cluster never wraps a single button onto a line of its own. */}
          <Toolbar disableGutters variant="dense" sx={{ flexWrap: "wrap", gap: 1, minHeight: 0 }}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", minWidth: 0, order: 1 }}
            >
              <BrandMark />
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                sx={{ display: { xs: "none", lg: "block" } }}
              >
                {formatRange(days[0], days[days.length - 1])}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
                width: { xs: "100%", md: "auto" },
                justifyContent: { xs: "space-between", md: "flex-end" },
                order: { xs: 3, md: 2 },
                ml: { md: "auto" },
              }}
            >
              <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
                <Tooltip title="Previous span">
                  <IconButton
                    size="small"
                    onClick={() => setViewStart(addDays(viewStart, -dayCount))}
                    aria-label="Previous span"
                  >
                    <KeyboardDoubleArrowLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Previous day">
                  <IconButton
                    size="small"
                    onClick={() => setViewStart(addDays(viewStart, -1))}
                    aria-label="Previous day"
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next day">
                  <IconButton
                    size="small"
                    onClick={() => setViewStart(addDays(viewStart, 1))}
                    aria-label="Next day"
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next span">
                  <IconButton
                    size="small"
                    onClick={() => setViewStart(addDays(viewStart, dayCount))}
                    aria-label="Next span"
                  >
                    <KeyboardDoubleArrowRightIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" size="small" onClick={goToday} sx={{ ml: 0.5 }}>
                  Today
                </Button>
              </Stack>

              <ToggleButtonGroup
                exclusive
                size="small"
                value={dayCount}
                onChange={(_, v) => v && setDayCount(v as DayCount)}
                aria-label="Days shown"
              >
                {([3, 5, 7] as const).map((n) => (
                  <ToggleButton key={n} value={n} aria-label={`Show ${n} days`} sx={{ px: 1.5 }}>
                    {n}d
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                flexShrink: 0,
                ml: { xs: "auto", md: 0 },
                order: { xs: 2, md: 3 },
              }}
            >
              <SettingsDialog
                habits={habits}
                tasksGoal={tasksGoal}
                onCreateHabit={(input) => createHabit.mutate(input)}
                onUpdateHabit={(id, patch) => updateHabit.mutate({ id, patch })}
                onDeleteHabit={(id) => deleteHabit.mutate(id)}
                onSetTasksGoal={(g) => setTasksGoal.mutate(g)}
              />
              <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
              <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
                <IconButton onClick={toggle} aria-label="Toggle light and dark mode">
                  {mounted && mode === "dark" ? (
                    <LightModeOutlinedIcon />
                  ) : (
                    <DarkModeOutlinedIcon />
                  )}
                </IconButton>
              </Tooltip>
              {isGuest ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate({ to: "/auth" })}
                  sx={{ ml: 0.5, whiteSpace: "nowrap" }}
                >
                  Save my data
                </Button>
              ) : (
                <Tooltip title="Sign out">
                  <IconButton onClick={signOut} aria-label="Sign out">
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Toolbar>

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: "stretch", justifyContent: "flex-end", mt: 1.5 }}
          >
            <QuotePanel weekKey={toDateKey(getWeekStart(days[0]))} />
            <StatsPanel
              tasksDone={tasksDone}
              tasksGoal={tasksGoal}
              habitStats={habitStats}
              onSetTasksGoal={(g) => setTasksGoal.mutate(g)}
            />
          </Stack>
        </Box>
      </AppBar>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box component="main" sx={{ mx: "auto", maxWidth: 1600, px: { xs: 1, sm: 2 }, py: 2 }}>
          <Paper
            variant="outlined"
            ref={gridRef}
            sx={{
              display: "flex",
              overflowX: { xs: "auto", md: "hidden" },
              scrollSnapType: { xs: "x mandatory", md: "none" },
              scrollPaddingLeft: 8,
            }}
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
                  isExpanded={expanded === dateKey}
                  onToggleExpand={() =>
                    setExpandedDate((cur) => (cur === dateKey ? null : dateKey))
                  }
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
          </Paper>
        </Box>
        <DragOverlay>
          {activeTodo ? (
            <Paper elevation={6} sx={{ px: 1.5, py: 1, fontSize: 14, cursor: "grabbing" }}>
              {activeTodo.title || "Untitled"}
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={goalCelebration}
        onClose={() => setGoalCelebration(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: "center" }}>🎉 Weekly goal reached!</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: "center" }}>
            You've completed {tasksGoal} {tasksGoal === 1 ? "task" : "tasks"} this week. Nice work.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2.5 }}>
          <Button variant="contained" onClick={() => setGoalCelebration(false)}>
            Keep going
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function DayColumn({
  day,
  label,
  isToday,
  isExpanded,
  onToggleExpand,
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
  isExpanded: boolean;
  onToggleExpand: () => void;
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

  // Spring-driven width. On mobile the columns are fixed-width in a scrolling
  // row, so there is no free space for flex-grow to claim and this is inert.
  const grow = useSpring(isExpanded ? EXPANDED_GROW : 1, GROW_SPRING);
  useEffect(() => {
    grow.set(isExpanded ? EXPANDED_GROW : 1);
  }, [isExpanded, grow]);

  function confirmAdd() {
    if (draft.trim()) onAdd(draft);
    setDraft("");
    setAdding(false);
  }

  return (
    <MotionBox
      ref={setNodeRef}
      data-date={dateKey}
      className="day-column"
      style={{ flexGrow: grow }}
      sx={{
        width: { xs: "88vw", md: "auto" },
        maxWidth: { xs: 360, md: "none" },
        flexShrink: { xs: 0, md: 1 },
        flexBasis: { xs: "auto", md: 0 },
        minWidth: 0,
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        borderRight: 1,
        borderColor: "divider",
        "&:last-of-type": { borderRight: 0 },
        bgcolor: (t) =>
          isOver
            ? `rgba(${t.vars.palette.primary.mainChannel} / 0.1)`
            : isToday
              ? `rgba(${t.vars.palette.primary.mainChannel} / 0.04)`
              : "background.paper",
        transition: "background-color .15s",
        // Row affordances stay hidden until the column is hovered or focused.
        "&:hover .col-affordance, &:focus-within .col-affordance": { opacity: 1 },
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${format(day, "EEEE, MMM d")}`}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        sx={{
          // Keeps the weekday visible while a long column scrolls past it.
          position: "sticky",
          top: 0,
          zIndex: 1,
          px: 1.5,
          py: 1,
          cursor: "pointer",
          userSelect: "none",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (t) =>
            isToday && !background
              ? `rgba(${t.vars.palette.primary.mainChannel} / 0.08)`
              : "background.paper",
        }}
      >
        {background && (
          <>
            {/* Bleeds 1px past the bottom padding edge so the image covers the
                translucent divider border, which otherwise blends with the paper
                background into a bright hairline under the tile. */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: -1,
                backgroundImage: `url(${background.src})`,
                backgroundSize: "cover",
                backgroundPosition: background.position ?? "center",
              }}
            />
            {/* Scrim keeps the label legible over both light and dark tiles. */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: -1,
                bgcolor: (t) => `rgba(${t.vars.palette.background.defaultChannel} / 0.55)`,
              }}
            />
          </>
        )}
        <Box sx={{ position: "relative" }}>
          <Typography
            variant="overline"
            color="text.secondary"
            // Whole-pixel line height: a fractional header height makes the
            // bottom edge land mid-pixel and antialias into a bright seam.
            sx={{ display: "block", lineHeight: "20px" }}
          >
            {label}
          </Typography>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontVariantNumeric: "tabular-nums",
              color: isToday ? "primary.main" : "text.primary",
              fontWeight: isToday ? 600 : 500,
            }}
          >
            {day.getDate()}
          </Typography>
        </Box>
      </Box>

      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
        id={`day-${dateKey}`}
      >
        <Box sx={{ px: 0.5, py: 1, minHeight: 140 }}>
          {todos.map((t) => (
            <TodoRow key={t.id} todo={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {adding ? (
            <Box sx={{ px: 0.5, py: 0.5 }}>
              <InputBase
                autoFocus
                fullWidth
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={confirmAdd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAdd();
                  if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder="New task…"
                sx={{
                  fontSize: 14,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: "primary.main",
                }}
              />
            </Box>
          ) : (
            <Button
              className={todos.length === 0 ? undefined : "col-affordance"}
              onClick={() => setAdding(true)}
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              size="small"
              color="inherit"
              fullWidth
              sx={{
                justifyContent: "flex-start",
                color: "text.secondary",
                fontSize: 12,
                fontWeight: 400,
                borderRadius: 1.5,
                opacity: todos.length === 0 ? 0.75 : 0,
                transition: "opacity .15s",
              }}
            >
              Add a task…
            </Button>
          )}
        </Box>
      </SortableContext>

      <Box sx={{ mt: "auto" }}>
        {habits.length > 0 && (
          <Stack spacing={0.5} sx={{ borderTop: 1, borderColor: "divider", px: 1, py: 1 }}>
            {habits.map((h) => {
              const entry = entries.find((e) => e.habit_id === h.id && e.date === dateKey);
              return (
                <Stack key={h.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", flex: 1, minWidth: 0, color: "text.secondary" }}
                    title={h.unit ? `${h.name} (${h.unit})` : h.name}
                  >
                    <HabitIcon name={h.icon} sx={{ fontSize: 14 }} />
                    <Typography variant="caption" noWrap>
                      {h.name}
                    </Typography>
                  </Stack>
                  <HabitInput
                    initialValue={entry ? String(entry.value) : ""}
                    onCommit={(v) => onEntry(h.id, dateKey, v)}
                  />
                </Stack>
              );
            })}
          </Stack>
        )}
        <DayNoteArea value={note} onCommit={onNoteChange} title={format(day, "EEEE, MMM d")} />
      </Box>
    </MotionBox>
  );
}

function DayNoteArea({
  value,
  onCommit,
  title,
}: {
  value: string;
  onCommit: (v: string) => void;
  title: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => setDraft(value), [value]);

  const commit = (v: string) => {
    if (v !== value) onCommit(v);
  };

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider", px: 1.5, py: 1 }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Notes
        </Typography>
        <Tooltip title="Edit full screen">
          <IconButton
            className="col-affordance"
            size="small"
            onClick={() => setFocused(true)}
            aria-label="Edit note full screen"
            sx={{ opacity: 0, transition: "opacity .15s", color: "text.secondary" }}
          >
            <OpenInFullIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <InputBase
        multiline
        fullWidth
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        placeholder="Add a note…"
        sx={{
          p: 0,
          fontSize: 12,
          alignItems: "flex-start",
          // Fixed height (not autosized) so a long note scrolls in place
          // instead of stretching the column past its neighbours.
          "& textarea": { height: "200px !important", overflow: "auto !important", resize: "none" },
        }}
      />

      <Dialog
        open={focused}
        onClose={() => {
          commit(draft);
          setFocused(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Notes — {title}</DialogTitle>
        <DialogContent>
          <InputBase
            autoFocus
            multiline
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note…"
            sx={{
              fontSize: 14,
              alignItems: "flex-start",
              "& textarea": { height: "60vh !important", overflow: "auto !important" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              commit(draft);
              setFocused(false);
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function HabitInput({
  initialValue,
  onCommit,
}: {
  initialValue: string;
  onCommit: (v: string) => void;
}) {
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

  const stepperSx = {
    width: 24,
    height: 28,
    borderRadius: 0,
    opacity: 0,
    transition: "opacity .15s",
    color: "inherit",
    ".habit-input:hover &, .habit-input:focus-within &": { opacity: 1 },
    "&.Mui-disabled": { opacity: 0 },
  } as const;

  return (
    <Box
      className="habit-input"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        borderRadius: 999,
        overflow: "hidden",
        border: 1,
        transition: "background-color .15s, border-color .15s",
        borderColor: filled ? "primary.main" : "divider",
        bgcolor: (t) =>
          filled ? `rgba(${t.vars.palette.primary.mainChannel} / 0.1)` : "action.hover",
        color: filled ? "primary.main" : "text.secondary",
      }}
    >
      <IconButton
        size="small"
        onClick={() => step(-1)}
        disabled={num <= 0}
        aria-label="Decrease"
        sx={stepperSx}
      >
        <RemoveIcon sx={{ fontSize: 13 }} />
      </IconButton>
      <InputBase
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => {
          if (val !== initialValue) onCommit(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          else if (e.key === "ArrowUp") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            step(-1);
          }
        }}
        onFocus={(e) => e.currentTarget.select()}
        placeholder="0"
        slotProps={{
          input: { inputMode: "numeric", pattern: "[0-9]*", "aria-label": "Habit value" },
        }}
        sx={{
          width: 26,
          color: "inherit",
          "& input": {
            p: 0,
            textAlign: "center",
            fontSize: 12,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
          },
        }}
      />
      <IconButton size="small" onClick={() => step(1)} aria-label="Increase" sx={stepperSx}>
        <AddIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/i;

function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  if (!match) return null;
  // Strip trailing punctuation that's more likely to be sentence
  // punctuation than part of the link (e.g. "check this out: url.").
  return match[0].replace(/[.,;:!?)\]}'"]+$/, "");
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function LinkPreviewCard({ url }: { url: string }) {
  const fetchPreview = useServerFn(fetchLinkPreview);
  const { data } = useQuery({
    queryKey: ["linkPreview", url],
    queryFn: () => fetchPreview({ data: url }),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const hostname = data?.hostname ?? hostnameOf(url);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, maxWidth: 260, py: 0.25 }}>
      <Box
        component="img"
        src={`https://www.google.com/s2/favicons?sz=32&domain=${hostname}`}
        alt=""
        sx={{ width: 16, height: 16, borderRadius: 0.5, flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontSize: 12,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data?.title || hostname}
        </Box>
        {data?.title && (
          <Box
            sx={{
              fontSize: 11,
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hostname}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function TitleWithLink({ title, url }: { title: string; url: string }) {
  const idx = title.indexOf(url);
  if (idx === -1) return <>{title}</>;
  const before = title.slice(0, idx);
  const after = title.slice(idx + url.length);
  return (
    <>
      {before && (
        <Box
          component="span"
          sx={{
            minWidth: 0,
            flexShrink: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {before}
        </Box>
      )}
      <Tooltip
        title={<LinkPreviewCard url={url} />}
        placement="bottom"
        arrow={false}
        enterDelay={400}
        disableInteractive
      >
        <Box
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          sx={{
            flexShrink: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "primary.main",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {url}
        </Box>
      </Tooltip>
      {after && (
        <Box
          component="span"
          sx={{
            minWidth: 0,
            flexShrink: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {after}
        </Box>
      )}
    </>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => setDraft(todo.title), [todo.title]);
  const url = useMemo(() => extractUrl(todo.title), [todo.title]);

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...(editing ? {} : listeners)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 0.25,
        pr: 0.5,
        borderRadius: 1.5,
        touchAction: "manipulation",
        userSelect: "none",
        cursor: editing ? "text" : "grab",
        "&:active": { cursor: editing ? "text" : "grabbing" },
        "&:hover": { bgcolor: "action.hover" },
        "&:hover .todo-delete, &:focus-within .todo-delete": { opacity: 1 },
        boxShadow: isDragging ? 2 : 0,
      }}
    >
      <Checkbox
        size="small"
        checked={todo.completed}
        onChange={() => onToggle(todo)}
        slotProps={{ input: { "aria-label": todo.title || "Untitled task" } }}
        icon={<RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />}
        checkedIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
        sx={{ p: 0.75, color: "primary.main" }}
      />
      {editing ? (
        <InputBase
          autoFocus
          fullWidth
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== todo.title) onEdit(todo, draft);
            setEditing(false);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
          sx={{ flex: 1, fontSize: 14, "& input": { p: 0 } }}
        />
      ) : (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditing(true);
            }
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            textAlign: "left",
            font: "inherit",
            fontSize: 14,
            background: "none",
            border: 0,
            p: 0,
            cursor: "default",
            overflow: "hidden",
            ...(url
              ? {}
              : { textOverflow: "ellipsis", whiteSpace: "nowrap" }),
            color: todo.completed ? "text.secondary" : "text.primary",
            textDecoration: todo.completed ? "line-through" : "none",
            fontStyle: todo.title ? "normal" : "italic",
          }}
        >
          {todo.title ? url ? <TitleWithLink title={todo.title} url={url} /> : todo.title : "Untitled"}
        </Box>
      )}
      <IconButton
        className="todo-delete"
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
        aria-label="Delete task"
        sx={{
          opacity: 0,
          transition: "opacity .15s, color .15s",
          color: "text.secondary",
          "&:hover": { color: "error.main" },
        }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete this task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {todo.title
              ? `“${todo.title}” will be permanently removed.`
              : "This task will be permanently removed."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onDelete(todo);
              setConfirmOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
