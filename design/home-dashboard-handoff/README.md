# Handoff: Flow Home dashboard (option 2a)

## Overview

A rework of the Home route in `ojones1965/nifty-clone` (Vite + React 19, react-router,
plain CSS in `src/index.css`). Same app, same data, reordered around one question:
**am I on pace against my goals?**

The current Home leads with today's revenue and profit, then Goals, then Needs attention.
This design leads with month pace — including a marker showing how far through the month
you are, so the bar reads as ahead/behind rather than just "some progress" — and adds two
cards built from data the store already holds: recent sales and an inventory snapshot.

## About the design files

`Flow Home.dc.html` in this bundle is a **design reference created in HTML** — a static
prototype of the intended layout, not production code to copy. Recreate it in the existing
React + plain-CSS environment using the app's established patterns: `src/pages/Home.jsx`
for the route, existing class names in `src/index.css`, existing store selectors.

The file contains three artboards. Implement **2a** (the teal one labelled "Repo styles").
2b is an alternative visual direction that would require new design tokens; 1a is an earlier
exploration made before the repo was connected, at a width the app's shell does not support.
Both are kept for reference only.

## Fidelity

**High-fidelity.** Colors, type sizes, spacing, and radii are taken from `src/index.css`
and should match exactly. Option 2a introduces **no new design tokens** — every value below
already exists in the stylesheet. The one genuinely new piece of CSS is the pace marker
(see "New CSS" at the bottom).

## Layout constraint

`.app-main` is `max-width: 680px` at every breakpoint, and `AppLayout` swaps a top nav
(≥720px) for a fixed bottom tab bar (≤719px). The design respects this: a single 680px
column, identical card order on desktop and mobile. No multi-column dashboard.

## Screens

### Home (`/`, `src/pages/Home.jsx`)

Page scaffolding is unchanged: `.page` > `.page-topbar` with `h1.topbar-title` "Home",
`.topbar-date` (`toLocaleDateString` weekday/month/day), and the `+ Add item`
`.btn.btn-primary` link to `/item/new`.

Card order, top to bottom:

#### 1. August pace (was "Goals")

`.card` with `.card-head`: `<h2>` reading `{monthName} pace`, and the existing
**Edit goals** `.btn.btn-outline.btn-sm` opening the existing `GoalsModal` unchanged.

`.card-sub`: `Day {dayOfMonth} of {daysInMonth} · {pct}% of the month gone`.

Then the existing `.goal-list` / `GoalRow` markup, with two changes to the first row:

- **Pace marker.** Absolutely positioned 2px × 16px `#1f2937` rule at
  `left: {monthElapsedPct}%` over the `.progress` track, with an 11.5px/600 label
  "today" centred beneath it (`transform: translateX(-50%)`).
- **Delta line** below the bar, 12.5px/700: `${delta} behind pace` in `var(--danger)`
  when behind, `${delta} ahead of pace` in `var(--accent-hover)` when ahead.
  `delta = |monthRevenue − monthlyRevenueGoal × monthElapsedFraction|`, rounded.

Second row (Monthly sales) is the existing `GoalRow`, no marker.

Keep the existing empty state (`.card-note`, "Set time-based targets…") when both goals
are null — but in that case the card should not claim a pace.

#### 2. Today's summary

Unchanged from the current implementation: two `.hero-box` tiles (Revenue today,
Profit today with `.hero-value.profit`), a `.stat-grid.two` of Sold / Listed,
an `<hr class="rule">`, a `.section-label` "Automation", and the four-up
`.stat-grid` of Shares / Relists / Offers / Follows.

#### 3. Needs attention

Unchanged: `.pill-tabs` Active (n) / Dismissed, `.alert-list` of `.alert-row` with
`.alert-text` link and the `.icon-btn` dismiss "×". Alerts still come from
`computeAlerts()` — ready-to-list drafts, listings older than 30 days, items missing
cost of goods.

#### 4. Recent sales (new)

`.card.table-card` (padding 0, overflow hidden). `.table-head` with the label
"Recent sales" and a right-aligned `<Link to="/analytics">Analytics</Link>`
(600/13.5px, `var(--accent)`).

Rows: the existing `.order-row` pattern from Analytics, from
`listOrders().slice(0, 4)`:

- `<MarketBadge id={o.marketplace} size={26} />` at the left
- `.order-info` > `.order-title` (item title) and `.order-meta`
  (`{marketplaceName} · {short date}`)
- `.order-side` > `.order-price` (`moneyShort(o.salePrice)`) and `.order-profit`
  (`+${salePrice − cogs − fees − shippingExpense}`, `.neg` when negative)

Empty state: a `.card-note` "No sales recorded yet."

#### 5. Inventory (new)

`.card` with `.card-head`: `<h2>Inventory</h2>` and a `<Link to="/inventory">View all</Link>`.
A three-column `.stat-grid` (override to `repeat(3, 1fr)`) of `StatBox`:
Drafts / Listed / Sold, counted from `listItems(status).length`.

Below it, a `.card-note`: `{n} listings have been up more than 30 days.`
where `n` counts `listItems('listed')` with `Date.now() − listedAt > 30 * 86400000`.
Hide the note when `n === 0`.

## Data — all from the existing store

| UI | Source |
| --- | --- |
| Revenue / Profit today, Sold | `listOrders()` filtered to `isoDate()` |
| Listed today | `listItems()` where `isoDate(new Date(listedAt)) === today` |
| Month revenue / sales | `listOrders()` where `date >= monthStart` |
| Goals + targets | `getGoals()`, `setGoals()` |
| Automation counters | `getAutomation()` |
| Alerts | `computeAlerts()` + `getDismissedAlerts()` / `dismissAlert()` |
| Recent sales | `listOrders()` (already sorted newest first) |
| Inventory counts + aging | `listItems(status)`, `item.listedAt` |

Pace percentages are derived from the date, not stored.

## Not included, and why

Three blocks from the earlier exploration were dropped — the data model has no source
for them. Each would need a schema change first:

- **Top-performing listings** — needs per-listing views/likes. Nothing in `items` tracks
  engagement, and there is no marketplace API in this app.
- **Offer expiry timers** — needs offer records with timestamps. `automation.offers` is a
  flat counter.
- **Per-job automation status / last run** — `automation` is
  `{ shares, relists, offers, follows, enabled }` with no per-job state or timestamp.
  Adding `lastRunAt` per job would be a small, self-contained change if you want this.

## State

Same as today: `useStoreVersion()` for re-render, `useState` for `alertTab`
(`'active' | 'dismissed'`) and `editingGoals`. No new state, no data fetching.

## Design tokens (all existing, `src/index.css`)

`--accent: #0d9488` · `--accent-hover: #0f766e` · `--accent-soft: rgba(13,148,136,.1)`
`--bg: #f6f8f9` · `--surface: #fff` · `--border: #e2e8f0` · `--text: #1f2937`
`--text-muted: #64748b` · `--danger: #e5484d` · `--radius: 14px`
`--shadow: 0 1px 2px rgba(15,23,42,.05), 0 3px 12px rgba(15,23,42,.05)`

Type: system stack, 15px/1.5 base. h1 21px/700 (`.topbar-title`), h2 18px/700,
`.hero-value` 28px/700, `.stat-value` 22px/700, `.card-sub` 13.5px muted,
`.section-label` 12px/700 uppercase 0.06em.

## New CSS

Only the pace marker. Suggested addition next to the existing `.progress` rules:

```css
.progress-wrap { position: relative; }
.pace-marker {
  position: absolute;
  top: 0;
  width: 2px;
  height: 16px;
  background: var(--text);
  transform: translateX(-50%);
}
.pace-marker span {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}
.pace-delta { font-size: 12.5px; font-weight: 700; }
.pace-delta.behind { color: var(--danger); }
.pace-delta.ahead { color: var(--accent-hover); }
```

Give `.goal-row` enough bottom room (roughly 20px) for the marker label.

## Assets

None new. The design uses `src/components/Logo.jsx` and `src/components/MarketBadge.jsx`
as-is, and the tab icon paths already in `src/components/AppLayout.jsx`.

## Files

- `Flow Home.dc.html` — the design reference (implement artboard 2a)
- Repo files to change: `src/pages/Home.jsx`, `src/index.css`
- Repo files to read but not change: `src/components/AppLayout.jsx`,
  `src/components/MarketBadge.jsx`, `src/lib/analyticsStore.js`, `src/lib/itemsStore.js`,
  `src/lib/format.js`
