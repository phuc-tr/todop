# datewise

Weekly Productivity Tracker

Build a minimalistic weekly productivity tracker web app with a Google Calendar–inspired design. Use Supabase for authentication and data storage.

## Core Layout

The main view is a weekly grid: 7 day columns laid out horizontally (Monday–Sunday), similar to Google Calendar's week view. The current day's column is subtly highlighted. A header above the grid shows the week's date range with previous/next arrows and a "Today" button to navigate between weeks. All data is stored per-week, so navigating to past or future weeks shows that week's todos and habit entries.

Each day column is split vertically into two stacked sections:

1. **Todo section (top):** A todo list for that day. Each todo has a checkbox and a title. I can add a todo inline (click an empty row or a "+" that appears on hover), edit a todo's text by clicking it, check it off as done (with strikethrough styling), and delete it (small "x" on hover). Completed todos stay visible.

2. **Habit tracking section (bottom):** A row for each habit I've defined (e.g., "Pages read", "LeetCode problems"). Each cell contains a number input where I type the value for that day (default empty/0). Values save automatically on blur or Enter.

## Habits

- A settings panel (gear icon) where I manage habits: add a habit with a name and a weekly goal number, edit, and delete habits.
- Habits appear as rows in the bottom section of every day column.
- Daily entries are just numbers typed manually.

## Statistics Panel (top right)

A compact stats area in the top-right of the screen showing, for the currently viewed week:

- **Tasks:** number of completed todos vs. weekly task goal (e.g., "12 / 20 tasks"), with a progress bar.
- **Each habit:** the sum of that habit's daily numbers for the week vs. its weekly goal (e.g., "Pages: 85 / 100"), each with its own progress bar.
- Progress bars fill proportionally and turn a success color (green) when the goal is reached.
- The weekly task goal is editable by clicking the number in the stats panel or via the settings panel.

## Drag and Drop

Full drag-and-drop support for todos:

- Drag a todo from one day to another day within the week.
- Reorder todos within the same day by dragging.
- Show a clear visual drop indicator (placeholder line / highlighted column) while dragging.
- Use a well-supported library like @dnd-kit for smooth behavior on both desktop and touch devices.

## Auth & Data (Supabase)

- Email/password sign up and login (magic link optional). All data is scoped to the logged-in user.
- Tables (suggested): `todos` (id, user_id, title, date, completed, sort_order), `habits` (id, user_id, name, weekly_goal), `habit_entries` (id, user_id, habit_id, date, value), `settings` (user_id, weekly_task_goal).
- Changes save automatically — no explicit save button. Optimistic UI updates with graceful error handling.

## Design & Theme

- Built on [Material UI](https://mui.com) following Material Design: components come from `@mui/material`, icons from `@mui/icons-material`, and all styling goes through the `sx` prop or the theme in `src/lib/muiTheme.ts` — no utility-class framework.
- Light and dark mode are Material UI colour schemes, one per accent colour (`light-rose`, `dark-mono`, …), applied as a class on `<html>` before hydration so neither the mode nor the accent flashes on load.
- Minimalistic, clean, lots of whitespace — visually similar to Google Calendar: thin light borders between day columns, simple sans-serif typography, restrained color use (one accent color, e.g., Google-blue).
- Light and dark theme with a toggle in the header; remember the user's preference.
- Responsive / mobile-friendly: on narrow screens, collapse the 7-column grid into a vertically scrollable list of days (or a swipeable single-day view), keep the stats panel accessible at the top, and make sure drag-and-drop still works with touch.

## Nice Details

- Empty states with subtle hints (e.g., "Add a task…").
- Keyboard support: Enter to add/confirm a todo, Escape to cancel editing.
- Subtle transitions for checking off todos and theme switching — nothing flashy.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://todop.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1a1cb279-d336-45fa-a8df-d100610a5440).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
