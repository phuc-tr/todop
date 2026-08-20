import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { failure, ok, requireUser, unauthenticated } from "./shared";

export default defineTool({
  name: "delete_task",
  title: "Delete task",
  description: "Permanently delete one of the signed-in user's tasks.",
  inputSchema: { id: z.string().uuid().describe("Task id.") },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!requireUser(ctx)) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("todos").delete().eq("id", id).select("id");
    if (error) return failure(error.message);
    if (!data?.length) return failure("No task found with that id.");
    return ok(`Deleted task ${id}.`);
  },
});
