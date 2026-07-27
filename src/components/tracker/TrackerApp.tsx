import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut, Plus, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  getWeekDays,
  getWeekStart,
  toDateKey,
} from "@/lib/week";

type Todo = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
  sort_order: number;
};
type Entry = { id: string; habit_id: string; date: string; value: number };

type DayCount = 3 | 4 | 7;
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

export function TrackerApp({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
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
  const startKey = toDateKey(days[0]);
  const endKey = toDateKey(days[days.length - 1]);

  const todosKey = ["todos", userId, startKey];
  const entriesKey = ["entries", userId, startKey];

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
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
    if (!t.id.startsWith("tmp-")) updateTodo.mutate({ id: t.id, patch: { completed: !t.completed } });
  }
  function handleEditTitle(t: Todo, title: string) {
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, title } : x)));
    if (!t.id.startsWith("tmp-")) updateTodo.mutate({ id: t.id, patch: { title } });
  }
  function handleDelete(t: Todo) {
    setTodos((prev) => prev.filter((x) => x.id !== t.id));
    if (!t.id.startsWith("tmp-")) deleteTodo.mutate(t.id);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
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

    const targetList = todos
      .filter((t) => t.date === targetDate && t.id !== activeTodo.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const insertIndex = overTodo ? targetList.findIndex((t) => t.id === overTodo!.id) : targetList.length;
    const finalIndex = insertIndex < 0 ? targetList.length : insertIndex;

    const newTargetList = [
      ...targetList.slice(0, finalIndex),
      { ...activeTodo, date: targetDate },
      ...targetList.slice(finalIndex),
    ];
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
    mutationFn: async ({ name, weekly_goal }: { name: string; weekly_goal: number }) => {
      const { error } = await supabase
        .from("habits")
        .insert({ user_id: userId, name, weekly_goal, sort_order: habits.length });
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
    return { id: h.id, name: h.name, sum, goal: h.weekly_goal };
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const today = new Date();
  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">W</div>
            <h1 className="text-base font-medium tracking-tight">Weekly Tracker</h1>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" onClick={() => setViewStart(addDays(viewStart, -dayCount))} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setViewStart(addDays(viewStart, dayCount))} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-1"
              onClick={() =>
                setViewStart(
                  dayCount === 7
                    ? getWeekStart(new Date())
                    : (() => {
                        const t = new Date();
                        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
                      })(),
                )
              }
            >
              Today
            </Button>
            <span className="ml-3 text-sm text-muted-foreground hidden sm:inline">
              {formatRange(days[0], days[days.length - 1])}
            </span>
          </div>
          <div className="flex items-center rounded-md border border-border overflow-hidden">
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
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <StatsPanel
              tasksDone={tasksDone}
              tasksGoal={tasksGoal}
              habitStats={habitStats}
              onSetTasksGoal={(g) => setTasksGoal.mutate(g)}
            />
            <SettingsDialog
              habits={habits}
              tasksGoal={tasksGoal}
              onCreateHabit={(name, g) => createHabit.mutate({ name, weekly_goal: g })}
              onUpdateHabit={(id, patch) => updateHabit.mutate({ id, patch })}
              onDeleteHabit={(id) => deleteHabit.mutate(id)}
              onSetTasksGoal={(g) => setTasksGoal.mutate(g)}
            />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="mx-auto max-w-[1600px] px-2 sm:px-4 py-4">
          <div
            className="flex md:grid gap-px bg-border rounded-lg overflow-hidden overflow-x-auto snap-x snap-mandatory md:snap-none"
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
                  todos={dayTodos}
                  habits={habits}
                  entries={entries}
                  onAdd={(title) => handleAddTodo(title, dateKey)}
                  onToggle={handleToggle}
                  onEdit={handleEditTitle}
                  onDelete={handleDelete}
                  onEntry={handleEntryChange}
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
    </div>
  );
}

function DayColumn({
  day,
  label,
  isToday,
  todos,
  habits,
  entries,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onEntry,
}: {
  day: Date;
  label: string;
  isToday: boolean;
  todos: Todo[];
  habits: Habit[];
  entries: Entry[];
  onAdd: (title: string) => void;
  onToggle: (t: Todo) => void;
  onEdit: (t: Todo, title: string) => void;
  onDelete: (t: Todo) => void;
  onEntry: (habitId: string, date: string, value: string) => void;
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
      className={cn(
        "bg-background min-w-[220px] md:min-w-0 flex-1 snap-start flex flex-col group/col",
        isOver && "bg-primary-soft/40",
      )}
    >
      <div className={cn("px-3 py-2 border-b border-border sticky top-0 bg-background z-10", isToday && "bg-today")}>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("text-lg font-medium tabular-nums", isToday && "text-primary")}>
          {day.getDate()}
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

      {habits.length > 0 && (
        <div className="mt-auto border-t border-border px-2 py-2 space-y-1">
          {habits.map((h) => {
            const entry = entries.find((e) => e.habit_id === h.id && e.date === dateKey);
            return (
              <div key={h.id} className="flex items-center gap-2">
                <div className="text-[11px] text-muted-foreground truncate flex-1" title={h.name}>{h.name}</div>
                <HabitInput
                  initialValue={entry ? String(entry.value) : ""}
                  onCommit={(v) => onEntry(h.id, dateKey, v)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HabitInput({ initialValue, onCommit }: { initialValue: string; onCommit: (v: string) => void }) {
  const [val, setVal] = useState(initialValue);
  useEffect(() => setVal(initialValue), [initialValue]);
  return (
    <Input
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { if (val !== initialValue) onCommit(val); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder="0"
      className="h-7 w-14 text-xs px-2 tabular-nums"
    />
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
      className="group flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted/60 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
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
          onKeyDown={(e) => {
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
        onClick={() => onDelete(todo)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        aria-label="Delete"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}