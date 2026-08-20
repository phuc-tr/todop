import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { DATE_RE, failure, ok, requireUser, unauthenticated } from "./shared";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description:
    "Create a task for the signed-in user. Omit the date to add it to the Unscheduled column.",
  inputSchema: {
    title: z.string().trim().min(1).max(500).describe("Task text."),
    date: z.string().regex(DATE_RE).optional().describe("Day for the task, YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, date }, ctx) => {
    const userId = requireUser(ctx);
    if (!userId) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: last } = await supabase
      .from("todos")
      .select("sort_order")
      .is("date", date ? (null as never) : null)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sortOrder = date ? Date.now() % 100000 : ((last?.[0]?.sort_order ?? 0) + 1);
    const { data, error } = await supabase
      .from("todos")
      .insert({ user_id: userId, title, date: date ?? null, sort_order: sortOrder })
      .select("id, title, date, completed")
      .single();
    if (error) return failure(error.message);
    return ok(JSON.stringify(data), { task: data });
  },
});
