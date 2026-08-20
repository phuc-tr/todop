import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import { failure, ok, requireUser, unauthenticated } from "./shared";

export default defineTool({
  name: "list_habits",
  title: "List habits",
  description: "List the signed-in user's habits with their weekly goals and units.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!requireUser(ctx)) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("habits")
      .select("id, name, unit, weekly_goal, icon")
      .order("sort_order", { ascending: true });
    if (error) return failure(error.message);
    return ok(JSON.stringify(data ?? []), { habits: data ?? [] });
  },
});
