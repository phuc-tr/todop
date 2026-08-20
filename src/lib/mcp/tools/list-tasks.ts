import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { DATE_RE, failure, ok, requireUser, unauthenticated } from "./shared";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List the signed-in user's tasks. Filter by a date range (YYYY-MM-DD), by completion, or ask only for unscheduled tasks.",
  inputSchema: {
    from: z.string().regex(DATE_RE).optional().describe("Earliest date, YYYY-MM-DD."),
    to: z.string().regex(DATE_RE).optional().describe("Latest date, YYYY-MM-DD."),
    unscheduled_only: z.boolean().optional().describe("Only tasks with no date set."),
    completed: z.boolean().optional().describe("Filter by completion state."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows, default 100."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, unscheduled_only, completed, limit }, ctx) => {
    if (!requireUser(ctx)) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("todos")
      .select("id, title, date, completed, sort_order")
      .order("date", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true })
      .limit(limit ?? 100);
    if (unscheduled_only) query = query.is("date", null);
    else {
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
    }
    if (completed !== undefined) query = query.eq("completed", completed);
    const { data, error } = await query;
    if (error) return failure(error.message);
    return ok(JSON.stringify(data ?? []), { tasks: data ?? [] });
  },
});
