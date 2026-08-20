import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { DATE_RE, failure, ok, requireUser, unauthenticated } from "./shared";

export default defineTool({
  name: "log_habit",
  title: "Log habit progress",
  description:
    "Record a habit value for a given day. Use list_habits first to get the habit id. Set mode to 'add' to increment the existing value.",
  inputSchema: {
    habit_id: z.string().uuid().describe("Habit id from list_habits."),
    date: z.string().regex(DATE_RE).describe("Day to log, YYYY-MM-DD."),
    value: z.number().min(0).max(100000).describe("Value in the habit's unit."),
    mode: z.enum(["set", "add"]).optional().describe("Replace the value (default) or add to it."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ habit_id, date, value, mode }, ctx) => {
    const userId = requireUser(ctx);
    if (!userId) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: existing, error: readError } = await supabase
      .from("habit_entries")
      .select("id, value")
      .eq("habit_id", habit_id)
      .eq("date", date)
      .maybeSingle();
    if (readError) return failure(readError.message);
    const next = mode === "add" ? (existing?.value ?? 0) + value : value;
    if (existing) {
      const { data, error } = await supabase
        .from("habit_entries")
        .update({ value: next })
        .eq("id", existing.id)
        .select("id, habit_id, date, value")
        .single();
      if (error) return failure(error.message);
      return ok(JSON.stringify(data), { entry: data });
    }
    const { data, error } = await supabase
      .from("habit_entries")
      .insert({ user_id: userId, habit_id, date, value: next })
      .select("id, habit_id, date, value")
      .single();
    if (error) return failure(error.message);
    return ok(JSON.stringify(data), { entry: data });
  },
});
