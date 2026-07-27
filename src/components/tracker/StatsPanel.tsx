import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { HabitIcon } from "./habitIcons";

type HabitStat = { id: string; name: string; sum: number; goal: number; unit?: string; icon?: string };

export function StatsPanel({
  tasksDone,
  tasksGoal,
  habitStats,
  onSetTasksGoal,
}: {
  tasksDone: number;
  tasksGoal: number;
  habitStats: HabitStat[];
  onSetTasksGoal: (goal: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(tasksGoal));

  const taskPct = tasksGoal > 0 ? Math.min(100, (tasksDone / tasksGoal) * 100) : 0;
  const taskDone = tasksGoal > 0 && tasksDone >= tasksGoal;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm w-full sm:w-80">
      <div className="space-y-2.5">
        {/* Tasks row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 font-medium text-muted-foreground truncate">Tasks</span>
          <Progress
            value={taskPct}
            className={cn("h-1.5 flex-1", taskDone && "[&>div]:bg-success")}
          />
          <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
            <span className={cn(taskDone && "text-success font-medium")}>{tasksDone}</span>
            {" / "}
            {editing ? (
              <Input
                autoFocus
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  const n = parseInt(draft) || 0;
                  onSetTasksGoal(n);
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") { setDraft(String(tasksGoal)); setEditing(false); }
                }}
                className="inline-block h-5 w-12 px-1 py-0 text-xs"
              />
            ) : (
              <button
                className="underline-offset-2 hover:underline"
                onClick={() => { setDraft(String(tasksGoal)); setEditing(true); }}
              >
                {tasksGoal}
              </button>
            )}
          </span>
        </div>

        {/* Habit rows */}
        {habitStats.length > 0 && habitStats.map((h) => {
          const pct = h.goal > 0 ? Math.min(100, (h.sum / h.goal) * 100) : 0;
          const done = h.goal > 0 && h.sum >= h.goal;
          const unit = h.unit?.trim();
          return (
            <div key={h.id} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 flex items-center gap-1 min-w-0 text-muted-foreground" title={h.name}>
                {h.icon && <HabitIcon name={h.icon} className="h-3 w-3 shrink-0" />}
                <span className="truncate">{h.name}</span>
              </span>
              <Progress value={pct} className={cn("h-1.5 flex-1", done && "[&>div]:bg-success")} />
              <span className={cn("w-16 shrink-0 text-right tabular-nums text-muted-foreground", done && "text-success font-medium")}>
                {h.sum} / {h.goal}{unit ? ` ${unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}