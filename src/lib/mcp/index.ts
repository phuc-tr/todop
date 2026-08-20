import { auth, defineMcp } from "@lovable.dev/mcp-js";
import createTask from "./tools/create-task";
import deleteTask from "./tools/delete-task";
import listHabits from "./tools/list-habits";
import listTasks from "./tools/list-tasks";
import logHabit from "./tools/log-habit";
import updateTask from "./tools/update-task";
import weekSummary from "./tools/week-summary";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// Supabase value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "datewise",
  title: "datewise",
  version: "0.1.0",
  instructions:
    "Tools for the datewise weekly productivity tracker. Tasks live on a Monday-Sunday grid; tasks without a date sit in the Unscheduled column. Use list_tasks/create_task/update_task/delete_task for tasks, list_habits/log_habit for habit tracking, and week_summary for progress against weekly goals. All dates are YYYY-MM-DD and all data belongs to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasks, createTask, updateTask, deleteTask, listHabits, logHabit, weekSummary],
});
