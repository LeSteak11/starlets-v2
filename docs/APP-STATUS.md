# Starlets — Application Status Report

**Project:** `starlets-v2`
**Phase:** 1 complete, unreleased
**Date:** 2026-09-06
**Verified against:** the source, not the plan. Every claim below was read out of the repository or produced by running it.

---

## 1. Executive summary

Phase 1 is a **complete, playable, single-loop prototype**. A player can scan for a creature, play a timing minigame to catch it, and see it recorded in a collection screen. That loop works end to end, survives page reloads mid-encounter, and is covered by passing tests.

It is roughly **8% of the designed game**. Three of eighteen creatures exist, one of five screens exists, and none of the progression, battle, economy, or monetization systems have been started.

The code that does exist is in good shape — cleanly separated, deterministic, well tested, and defensive about player data. The main liabilities are organizational rather than technical: nothing is committed to version control, one creature has no artwork, and the entire UI lives in a single 888-line file that will not survive Phase 2.

| | |
|---|---|
| **Playable** | Yes, locally |
| **Deployed** | No |
| **Tests** | 9/9 passing |
| **Version controlled** | **No — zero commits** |
| **Accounts / backend** | None by design |
| **Monetization** | None |

---

## 2. Technology stack

| Layer | Choice | Version |
|---|---|---|
| Framework | React (RSC) | 19.2.6 |
| Meta-framework | `vinext` | 1.0.0-beta.5 |
| Build | Vite | 8.0.13 |
| Styling | Tailwind CSS | 4.2.1 |
| Components | shadcn + `@base-ui/react` | 4.18.0 / 1.7.0 |
| Icons | `lucide-react` | 1.31.0 |
| Hosting target | Cloudflare Workers (`wrangler`) | 4.92.0 |
| Language | TypeScript | 5.9.3 |
| Lint / format | oxlint / oxfmt | 1.76.0 / 0.61.0 |
| Runtime | Node | ≥ 22.13.0 |

Scaffolded with `@openai/sites-vite-plugin`. `vite.config.ts` already declares optional Cloudflare **D1** (database) and **R2** (object storage) bindings driven by `.openai/hosting.json` — the hooks for a future backend are present but unused.

**Commands:** `npm run dev` (localhost:3000) · `build` · `start` (Worker preview) · `test` · `typecheck` · `lint` · `format`

---

## 3. File inventory

```
app/
  layout.tsx      34 lines   Root layout, Geist fonts, metadata
  page.tsx       888 lines   THE ENTIRE APPLICATION UI
  globals.css    726 lines   Design tokens + ~48 hand-written classes
lib/
  balance.ts     103 lines   All tuning values + the SPECIES roster
  game.ts        258 lines   Pure game logic and save validation
  game.test.ts   137 lines   9 tests
  utils.ts         6 lines   shadcn cn() helper
components/ui/    60 files   Vendored shadcn — 4 used, 56 unused
hooks/
  use-mobile.ts              Unused
public/
  creatures/mossbun.png      1.9 MB
  creatures/novafox.png      2.0 MB
  favicon.svg                Doubles as Emberpanda's placeholder art
docs/
  PHASE-2-PLAN.md            Phase 2 developer brief
  APP-STATUS.md              This document
```

**Total application code: ~2,150 lines.**

---

## 4. What is built

### 4.1 The core loop

```
Scan → mystery signal → spend a Spark → Signal Lock → catch or Familiarity → Starbook → Scan
```

Every arrow in that chain is implemented and working.

### 4.2 Signal Lock (the capture minigame)

The most developed system in the app, and the one that has to carry the game.

A creature sits at the center of a 300×300 SVG ring. A white tracer orbits it continuously via `requestAnimationFrame`. A colored arc marks the target zone — a wide green band for Good, a bright inner band for Perfect. The player taps **Fire tether** to shoot at wherever the tracer currently sits.

| Mechanic | Value |
|---|---|
| Tethers per encounter | 4 |
| Meter needed to catch | 80 |
| Perfect window | ±13° → 32 points |
| Good window | ±38° → 23 points |
| Miss | 5 points |
| Per-tether variance | ±3, **pre-rolled at scan time** |
| Cooldown between shots | 650 ms |
| Orbit period | 2,600 ms (4,500 ms in slow mode) |
| Target rotation | +83° after every tether |

Three details worth calling out as good engineering:

- **Variance is rolled when the encounter is created, not when the tether fires.** Reloading the page cannot reroll a bad outcome. This closes the most obvious save-scumming exploit before it exists.
- **The target rotates 83° between tethers**, so the player cannot memorize one spot and tap the same rhythm four times.
- **Per-species speed multipliers** (Mossbun 1.0, Emberpanda 1.08, Novafox 1.18) mean rarer creatures orbit faster. Difficulty already scales with rarity without any extra system.

The animation pauses when a dialog opens or the browser tab is hidden, and clamps frame deltas to 50 ms so a stalled tab cannot fast-forward the orbit.

### 4.3 Economy

| System | State |
|---|---|
| **Sparks** (energy) | Start 6, cap 8, +1 per 90 minutes, 1 per encounter. Overflow from intro rewards is retained above cap. |
| **Stardust** (currency) | Common 20 / Rare 40 / Epic 80 / Legendary 160. Tracked globally **and** per species. **Fully unspendable — there are no sinks.** |
| **Familiarity** (pity) | +25 per failed encounter, caps at 100, guarantees the next catch of that species, resets on catch. |
| **XP** | Values defined (new 50, duplicate 20, cap 30). **Not awarded, not tracked, not displayed.** |

### 4.4 Onboarding

Three free, guaranteed intro encounters that cost no Spark and grant +1 Spark each. Functional but minimal — the scripted Welcome Constellation, the clue between catches, and the Starguide handoff from the design are all still Phase 2.

### 4.5 Starbook

A three-card grid. Uncaught creatures render as darkened silhouettes labeled "Unknown signal" with a Familiarity counter. Caught creatures reveal name, zone, rarity, Core icon in the species color, and a catch count. Tapping any card opens a detail dialog with lore, times caught, Familiarity, species Stardust, Base Potential, default Card, Signature move name, and first-contact date.

### 4.6 Persistence

localStorage under key `starlets.phase1.v1`. The strongest part of the codebase.

- `parseSave` validates **every field** — types, integer safety, numeric ranges, array lengths, enum membership, and cross-field consistency (a `lock`-stage encounter cannot already have 4 tethers spent).
- A damaged save **throws and is preserved**. The app shows an error rather than silently overwriting the player's progress. This is the correct choice and should be defended in every future phase.
- Every mutation re-reads from localStorage before applying, so two tabs cannot clobber each other.
- `storage` events sync open tabs live.
- In-flight encounters survive reload at any stage — signal, lock, or result — including a spent Spark.
- Clock manipulation is handled: `regenerate()` refuses to run when `now` is earlier than the last regeneration timestamp.

### 4.7 Settings

A slower-timing accessibility toggle (2,600 ms → 4,500 ms orbit, **same rewards**, disabled mid-encounter) and a two-step confirmed local save reset.

### 4.8 Accessibility

`aria-live` on the catch meter and result, `aria-label` on every icon-only control, `aria-current` on navigation, and a `prefers-reduced-motion` block that disables decorative animation while keeping the functional orbit tracer moving — because it is the game, not decoration.

### 4.9 Experimental: WebMCP bridge

`page.tsx` registers an **optional, read-only** `read_starbook` tool on `document.modelContext` if that API exists, letting an AI agent inspect discoveries, Spark count, and encounter stage. It is wrapped in try/catch and aborts cleanly on unmount. It cannot modify state, and the game is fully functional without it.

---

## 5. Content

| Item | Built | Designed |
|---|---|---|
| Creatures | 3 | 18 |
| Planets | 1 (Lunara) | 1 at launch |
| Zones | 3 named, **not implemented as a system** | 3 |
| Starlet Cards | 3 default, ownership only | 24 |
| Starguides | 0 | 4 |
| Artwork | 2 of 3 | 18+ |

**Roster:**

| # | Name | Rarity | Core | Zone | Speed | Art |
|---|---|---|---|---|---|---|
| 001 | Mossbun | Common | Grove | Moon Garden | 1.00 | ✅ |
| 002 | Novafox | Rare | Tide | Crater Coast | 1.18 | ✅ |
| 003 | Emberpanda | Common | Flare | Prism Caves | 1.08 | ❌ **placeholder** |

Zones exist as display strings on each creature. There is no zone selection, no zone-restricted spawning, and no zone completion tracking.

---

## 6. What is not built

Nothing below has been started.

**Progression** — Level, Bond, Star Power, Star Rise / evolution, Star Marks, Companion selection.
**Daily systems** — Starbond Sessions, daily reset, streak track, daily rewards, any reason to return tomorrow.
**Battle** — Star Trials, the four combat stats, Cores as a matchup triangle, Abilities, Signature Moves. Cores exist purely as decorative labels.
**Cards** — equip flow, alternate Cards, Card Shards, duplicate conversion.
**Economy** — Signal Market, shop, daily Card Signal, any Stardust sink whatsoever.
**Money** — premium currency, SKUs, payment processing, and the backend all of it requires.
**Screens** — Trials, Habitat, and Market do not exist. Navigation has 2 destinations against a designed 5.
**Infrastructure** — accounts, cloud saves, server-authoritative state, analytics of any kind.
**Deferred by design** — GPS, multiplayer, trading, chat, raids.

---

## 7. Known issues

**Blocking**

1. **Zero git commits.** The entire project is untracked working-directory state. One bad command loses everything. Highest-priority fix.
2. **Emberpanda has no artwork.** It renders the app's favicon. This is the third tutorial catch — the exact moment onboarding is meant to pay off.

**Structural**

3. **`app/page.tsx` is 888 lines** containing every screen, dialog, and the capture minigame. It cannot absorb three more screens.
4. **56 unused shadcn components** are vendored in `components/ui/`. Only `switch`, `progress`, `dialog`, and `alert-dialog` are imported. `hooks/use-mobile.ts` is unused.
5. **Stray Next.js scaffolding** — `next.config.ts` and `.next/` exist from a scaffold this Vite build does not use.

**Design conflicts** (detailed in `PHASE-2-PLAN.md` §2)

6. **Spark values disagree** with the design doc — code is 6/8, doc says 5/6. Resolution: keep the code's values.
7. **A `Potential` stat system exists in code** (`potential`, `riseMultiplier`, `trainingPerLevel`, `developedPotential()`) that appears nowhere in the design, and competes with the specified Health/Power/Speed/Shield model. It is surfaced in the Starbook detail dialog as "Base Potential." Resolution: delete it.

**Performance**

8. **Creature art is ~2 MB per PNG**, served unoptimized. Three creatures is 6 MB; eighteen at this size is 35 MB. Needs WebP conversion and a size budget before the roster grows.

**Environment**

9. `node_modules` holds Windows binaries, so `typecheck` and `lint` cannot run from a Linux shell against this working copy. Tests run fine. Not a code defect — worth knowing before CI is set up.

---

## 8. Quality assessment

**Verified by running it:** `npm test` → **9 passed, 0 failed**, 140 ms.

Coverage: intro economy and reward bounds, scan/spend/resume across reloads, the Familiarity pity guarantee, normal catches and duplicate history, zero-Spark blocking, regeneration across cap/remainder/overflow/backward-clock, timing-quality boundary and wraparound math, save rejection, and rarity/launch-total rules.

Every test injects `rng` and `now`, so the suite is fully deterministic. That is the right pattern and Phase 2 should extend it rather than replace it.

**Not verified:** production build, browser/visual QA, and the WebMCP bridge. Passing unit tests do not imply any of these. The README states this explicitly, which is the honest thing to have written.

**What is strong:** logic is pure and completely separated from React — every state transition is a function from `Save` to `Save`. Save validation is genuinely rigorous. The variance pre-roll and clock guards show someone thought about exploits before they existed. Accessibility was considered from the start rather than retrofitted. Tuning is centralized in one file exactly as the handoff rule requires.

**What is weak:** one enormous UI file, unused dependency weight, an undesigned stat system that leaked into the build, and no version control.

---

## 9. Bottom line

**Phase 1 answered its question.** The catch loop works, it feels like a game, and the foundation underneath it is better than most prototypes at this stage — pure logic, deterministic tests, and a save layer that protects player data rather than trusting it.

**What it cannot yet answer** is whether anyone comes back tomorrow. There is no daily habit, nothing to spend currency on, nothing to progress toward, and no analytics to observe any of it. That is precisely what Phase 2 is scoped to fix.

**Do first, in order:** commit the repository, resolve the two design conflicts in §7, give Emberpanda real art, then split `page.tsx` before adding a single new feature.
