# Home page design exploration (2026-08-25)

Source files for the Claude Design canvas exploring three directions for the
Home dashboard. The live, viewable canvas is at:

https://claude.ai/code/artifact/dd806125-7a16-45f0-8411-a57f1127518f

Each `.dc.html` file is one artboard (a self-contained mockup using the app's
design tokens); `canvas.json` lays them out and holds the sticky-note
annotations describing each option's motivation and tradeoff.

- `Main.dc.html` — **Option A, "Refined current"** — the direction that was
  chosen and built into [src/pages/Home.jsx](../../src/pages/Home.jsx)
  (commit `6bd4db8`): money first with large tinted revenue/profit tiles,
  date + "+ Add item" in the header, Edit goals in the card header.
- `DataFirst.dc.html` — Option B, "Data-first": KPI row with context lines and
  a two-column desktop layout with an automation/month sidebar. Not built;
  its context lines under the numbers are worth revisiting.
- `Briefing.dc.html` — Option C, "Daily briefing": greeting, hero profit
  number, quick actions, and a prioritized "Up next" task list. Not built;
  the task-style attention list is worth revisiting.

The mock data is fabricated but internally consistent across all three boards
($142 revenue / $87 profit today, $1,840/$2,500 monthly goal, etc.).
