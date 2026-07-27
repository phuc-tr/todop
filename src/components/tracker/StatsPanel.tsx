import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

type HabitStat = { id: string; name: string; sum: number; goal: number };

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
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm w-full sm:w-72">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Tasks</span>
        <span>
          <span className={cn(taskDone && "text-success")}>{tasksDone}</span>
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
              className="inline-block h-5 w-14 px-1 py-0 text-xs"
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
      <Progress
        value={taskPct}
        className={cn("h-1.5 mt-1.5", taskDone && "[&>div]:bg-success")}
      />
      {habitStats.length > 0 && <div className="mt-3 space-y-2">
        {habitStats.map((h) => {
          const pct = h.goal > 0 ? Math.min(100, (h.sum / h.goal) * 100) : 0;
          const done = h.goal > 0 && h.sum >= h.goal;
          return (
            <div key={h.id}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate pr-2">{h.name}</span>
                <span className={cn("tabular-nums", done && "text-success font-medium")}>
                  {h.sum} / {h.goal}
                </span>
              </div>
              <Progress value={pct} className={cn("h-1.5 mt-1", done && "[&>div]:bg-success")} />
            </div>
          );
        })}
      </div>}
    </div>
  );
}