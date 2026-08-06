import { useState } from "react";
import Box from "@mui/material/Box";
import Input from "@mui/material/Input";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { HabitIcon } from "./habitIcons";

type HabitStat = {
  id: string;
  name: string;
  sum: number;
  goal: number;
  unit?: string;
  icon?: string;
};

function StatBar({
  label,
  value,
  valueSlot,
  done,
}: {
  label: React.ReactNode;
  value: number;
  valueSlot: React.ReactNode;
  done: boolean;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}
      >
        {label}
        <Typography
          variant="caption"
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: done ? "success.main" : "text.secondary",
            fontWeight: done ? 600 : 400,
            whiteSpace: "nowrap",
          }}
        >
          {valueSlot}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={value}
        color={done ? "success" : "primary"}
        sx={{ height: 6 }}
      />
    </Box>
  );
}

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
    <Paper
      variant="outlined"
      sx={{ px: 2, py: 1.75, width: { xs: "100%", sm: 288 }, flexShrink: 0 }}
    >
      <Stack spacing={1.75}>
        <StatBar
          label={
            <Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>
              Tasks
            </Typography>
          }
          value={taskPct}
          done={taskDone}
          valueSlot={
            <>
              {tasksDone}
              {" / "}
              {editing ? (
                <Input
                  autoFocus
                  type="number"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    onSetTasksGoal(parseInt(draft) || 0);
                    setEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      setDraft(String(tasksGoal));
                      setEditing(false);
                    }
                  }}
                  sx={{ width: 56, fontSize: 12, "& input": { py: 0, textAlign: "right" } }}
                />
              ) : (
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  color="inherit"
                  onClick={() => {
                    setDraft(String(tasksGoal));
                    setEditing(true);
                  }}
                  sx={{ font: "inherit", verticalAlign: "baseline" }}
                >
                  {tasksGoal}
                </Link>
              )}
            </>
          }
        />

        {habitStats.map((h) => {
          const pct = h.goal > 0 ? Math.min(100, (h.sum / h.goal) * 100) : 0;
          const done = h.goal > 0 && h.sum >= h.goal;
          const unit = h.unit?.trim();
          return (
            <StatBar
              key={h.id}
              value={pct}
              done={done}
              label={
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center", minWidth: 0, color: "text.secondary" }}
                  title={h.name}
                >
                  <HabitIcon name={h.icon} sx={{ fontSize: 14 }} />
                  <Typography variant="caption" noWrap>
                    {h.name}
                  </Typography>
                </Stack>
              }
              valueSlot={`${h.sum} / ${h.goal}${unit ? ` ${unit}` : ""}`}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}
