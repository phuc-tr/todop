import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { DATE_RE, addDays, failure, ok, requireUser, unauthenticated, weekStart } from "./shared";

export default defineTool({
  name: "week_summary",
  title: "Weekly progress summary",
  description:
    "Summarize the signed-in user's week: task completion against the weekly goal, and each habit's progress.",
  inputSchema: {
    date: z
      .string()
      .regex(DATE_RE)
      .describe("Any date inside the week of interest, YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    if (!requireUser(ctx)) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const start = weekStart(date);
    const end = addDays(start, 6);

    const [todos, habits, entries, settings] = await Promise.all([
      supabase.from("todos").select("id, title, date, completed").gte("date", start).lte("date", end),
      supabase.from("habits").select("id, name, unit, weekly_goal").order("sort_order"),
      supabase.from("habit_entries").select("habit_id, value").gte("date", start).lte("date", end),
      supabase.from("settings").select("weekly_task_goal").maybeSingle(),
    ]);
    const error = todos.error ?? habits.error ?? entries.error ?? settings.error;
    if (error) return failure(error.message);

    const completed = (todos.data ?? []).filter((t) => t.completed).length;
    const goal = settings.data?.weekly_task_goal ?? 0;
    const habitProgress = (habits.data ?? []).map((h) => ({
      habit: h.name,
      unit: h.unit,
      total: (entries.data ?? [])
        .filter((e) => e.habit_id === h.id)
        .reduce((sum, e) => sum + (e.value ?? 0), 0),
      weekly_goal: h.weekly_goal,
    }));

    const summary = {
      week_start: start,
      week_end: end,
      tasks: { total: todos.data?.length ?? 0, completed, weekly_goal: goal },
      habits: habitProgress,
    };
    return ok(JSON.stringify(summary), summary);
  },
});
