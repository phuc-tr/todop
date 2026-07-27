import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Trash2, Plus } from "lucide-react";
import { useState } from "react";

export type Habit = { id: string; name: string; weekly_goal: number };

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
  onCreateHabit: (name: string, weekly_goal: number) => void;
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
  onDeleteHabit: (id: string) => void;
  onSetTasksGoal: (goal: number) => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
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
          <div>
            <Label className="text-xs">Habits</Label>
            <div className="mt-2 space-y-2">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  <Input
                    value={h.name}
                    onChange={(e) => onUpdateHabit(h.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={h.weekly_goal}
                    onChange={(e) => onUpdateHabit(h.id, { weekly_goal: parseInt(e.target.value) || 0 })}
                    className="w-20"
                    placeholder="Goal"
                  />
                  <Button variant="ghost" size="icon" onClick={() => onDeleteHabit(h.id)} aria-label="Delete habit">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-xs text-muted-foreground">No habits yet.</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Habit name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Weekly goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-28"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!name.trim()) return;
                  onCreateHabit(name.trim(), parseInt(goal) || 0);
                  setName("");
                  setGoal("");
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