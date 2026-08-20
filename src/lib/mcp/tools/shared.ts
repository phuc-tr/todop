import type { ToolContext } from "@lovable.dev/mcp-js";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated. Connect this app first." }],
    isError: true,
  };
}

export function failure(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function ok(text: string, structuredContent?: Record<string, unknown>) {
  return structuredContent
    ? { content: [{ type: "text" as const, text }], structuredContent }
    : { content: [{ type: "text" as const, text }] };
}

export function requireUser(ctx: ToolContext): string | null {
  return ctx.isAuthenticated() ? (ctx.getUserId() ?? null) : null;
}

/** Monday-anchored week start for a YYYY-MM-DD date. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
