import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { DATE_RE, failure, ok, requireUser, unauthenticated } from "./shared";

export default defineTool({
  name: "update_task",
  title: "Update task",
  description:
    "Update one of the signed-in user's tasks: rename it, mark it complete, reschedule it, or unschedule it.",
  inputSchema: {
    id: z.string().uuid().describe("Task id."),
    title: z.string().trim().min(1).max(500).optional(),
    completed: z.boolean().optional(),
    date: z.string().regex(DATE_RE).nullable().optional().describe("New date, or null to unschedule."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, title, completed, date }, ctx) => {
    if (!requireUser(ctx)) return unauthenticated();
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (completed !== undefined) patch.completed = completed;
    if (date !== undefined) patch.date = date;
    if (Object.keys(patch).length === 0) return failure("Nothing to update.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("todos")
      .update(patch)
      .eq("id", id)
      .select("id, title, date, completed")
      .maybeSingle();
    if (error) return failure(error.message);
    if (!data) return failure("No task found with that id.");
    return ok(JSON.stringify(data), { task: data });
  },
});
