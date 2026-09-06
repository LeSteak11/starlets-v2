# Starlets — Phase 2 Developer Plan v3.0

**Status:** Active handoff brief. Replaces v2.0 entirely.
**Repo:** `starlets-v2` — Phase 1 complete, unreleased, uncommitted.
**Written:** 2026-09-06
**Companion doc:** `APP-STATUS.md` — verified inventory of what Phase 1 actually shipped.

---

## 0. The pivot

v2.0 scoped Phase 2 as progression plus a path toward Star Trials. That is cancelled.

**Reason:** battles do not solve the problem Phase 1 leaves behind. An unreleased 8% prototype with no daily habit, no currency sink, no accounts and no wallet does not get closer to revenue by adding a second combat simulator — it becomes a worse Pokémon clone with three monsters. Collection games that perform in 2026 win on packs, sets, display, streaks and time gates. That is the lane, and it is the lane where an art-heavy solo team has an actual advantage.

**One-line job for Phase 2:**

> Make someone open Starlets tomorrow, pull something, and care that a page in the Starbook is still incomplete.

### Keep

Signal Lock as the capture verb — it is the best thing in the build. Sparks as energy. Familiarity pity. Starbook as the home of the product. Pure `Save → Save` logic, strict `parseSave`, local-first. Mossbun / Novafox / Emberpanda as the tutorial set.

### Cut or freeze until after revenue

Star Trials, combat stats, the Core matchup triangle, Abilities, Signature Moves as combat. The `Potential` stat — deleted, not deferred. Habitat as a build target. GPS, raids, chat, trading. The 18-creature roster as a Phase 2 requirement.

### Deliberate exception: Cores survive as identity

The memo cuts "Core triangle." That kills the **matchup math**, not the Cores. Grove / Tide / Flare are already shipping as visual identity — icons, per-species colors, Starbook labels — and a collection game needs taxonomy for binder sorting and set structure. **Cores stay as a cosmetic and organizational axis with zero mechanical effect.** Nothing to build; just do not rip them out with the battle code.

---

## 1. What Phase 2 is now

Seven systems. Everything else is Phase 3.

| # | System | Why it exists |
|---|---|---|
| 1 | Cards as the product | The thing being collected has to be worth looking at |
| 2 | Sets and the binder | Visible incompleteness is the engine |
| 3 | Packs | The pull is the moment |
| 4 | Daily return | The habit — the actual hole in Phase 1 |
| 5 | Stardust sinks | Currency with no sink is not an economy |
| 6 | Monetization skeleton | Designed now, charged later |
| 7 | Share card | Distribution, with no UA budget |

---

## 2. Do first — before any feature work

Do not start §3 onward until these are done. They are cheap and everything else compounds on top of them.

1. **`git init` and commit Phase 1.** The whole project is untracked working-directory state. This is the real blocker. Fix `.gitignore` first (`.next/`, `.vinext/`, `.wrangler/`, `*.tsbuildinfo` — already covered; verify nothing else leaks).
2. **Emberpanda artwork.** The tutorial currently ends on the favicon.
3. **Delete `Potential`.** Remove `potential`, `riseMultiplier`, `trainingPerLevel` and `developedPotential()` from `lib/balance.ts`, drop its usage in the Starbook detail dialog, and delete the covering test at `game.test.ts:124`.
4. **Lock Sparks at 6 start / 8 cap / 90 min.** The code is the source of truth; the old doc's 5/6 is void. A 12-hour refill from empty is deliberate — it pairs with the 12-hour pack timer in §5.
5. **Split `app/page.tsx`.** 888 lines cannot absorb a binder, a pack opening, and a share renderer. Screens into route-level components, Signal Lock into its own module, logic stays pure in `lib/`.
6. **WebP + size budget on creature art.** Currently ~2 MB per PNG, unoptimized. Budget: **≤250 KB per card illustration**, WebP, 1024×1024, transparent. At 27 cards that is ~7 MB instead of 54 MB.
7. **Deploy a private build.** Cloudflare Workers is already configured. Local-only is not a product and cannot be playtested by anyone but you.

Prune the 56 unused shadcn components and the stray `next.config.ts` / `.next/` while you are in there.

---

## 3. Cards are the product

A **Starlet** is the creature. A **Card** is a specific printing of that creature, and the Card is what the player collects, sorts, displays and screenshots.

### 3.1 Data model

```ts
type Finish = 'Matte' | 'Foil' | 'Prism';
type CardRarity = 'Common' | 'Rare' | 'Epic' | 'Secret';

type CardDef = {
  id: string;            // 'lun-004-novafox-solar-runner'
  setId: string;         // 'lunara-01'
  number: number;        // binder position, 1-based, drives page layout
  speciesId: string;
  title: string;         // art name: 'Solar Runner'
  rarity: CardRarity;
  core: Core;            // identity only
  art: string;
  fullArt: boolean;      // borderless treatment
  finishes: Finish[];    // which printings exist for this card
};

type OwnedCard = {
  cardId: string;
  finishes: Partial<Record<Finish, number>>; // finish -> copies held
  firstAcquired: number;
  favorite: boolean;
};
```

**Finish is an axis, not a card.** A Foil Novafox occupies the same binder slot as a Matte Novafox — the slot shows the best finish owned, with a small indicator for the rest. This is how physical binders work, and it is the cheapest possible collectible depth: **finishes are shader and overlay work, not new illustrations.** One illustration can yield three chase-worthy objects.

### 3.2 The detail screen is a slab, not a stat sheet

Full-bleed art, the finish treatment rendered live (foil sweep on device tilt or pointer, prism refraction), set and number as `LUN 004 / 027`, title, artist line, copies owned per finish, first-acquired date, and a favorite toggle. No stats. No level. Nothing to read — something to look at.

The finish treatment is the single highest-leverage piece of visual work in Phase 2. It is what makes a duplicate feel different from a duplicate.

---

## 4. Set 01 and the binder

### 4.1 Structure

**Set 01 — "Lunara: First Light" — 27 cards = exactly 3 binder pages of 9.**

| Tier | Count | Notes |
|---|---|---|
| Common | 12 | Matte + Foil |
| Rare | 8 | Matte + Foil |
| Epic | 4 | Foil + Prism, full-art |
| Secret | 3 | Prism only, one per species, the chase |

The 9-slot page is not arbitrary. It is the physical binder page, it reads correctly on a phone as a 3×3 grid, and "two slots left on page 2" is a far sharper motivator than "68% complete."

### 4.2 Open decision — species count

The memo says three species. **I would push for six**, and this is the one call I want you to make rather than me.

Cutting battles removed almost everything a new species used to cost. A species is now: an illustration, a name, a zone string, a lore line, and a Signal Lock speed multiplier. There is no stat block, no ability, no matchup, no move. **Species became nearly as cheap as alt arts.**

- **Three species, 27 cards** = nine printings each. The player sees Mossbun nine ways. Risk: the set reads as repetitive, and "collect them all" has only three silhouettes behind it.
- **Six species, 27 cards** = four or five printings each. Same art volume, same systems cost, meaningfully more variety, and the Starbook silhouette grid — the thing that creates wanting — has twice the empty slots.

Three still ships. Six probably converts better for the same effort. Your call; the set data is content, not code, so this can be decided late.

### 4.3 Binder UX

- 3×3 pages, swipe between them, page indicator with per-page completion (`Page 2 · 7/9`).
- Unowned slots are silhouettes with the card number visible. **The player must always be able to see the shape of what is missing.**
- Sort and filter: set order, rarity, finish, Core, owned/missing.
- Set completion meter at the top with the reward stated inline — not hidden behind a menu.
- **Set completion reward: a player-selected Prism printing of any card in the set, plus a display frame.** Selected, never random. The last 10% of a set is only worth grinding if the payoff is known.
- A **Display Case**: pick 3 cards to feature, with the frame cosmetic applied. This is the flex surface and the thing the share card renders. It replaces Habitat as a build target and costs a fraction as much.

### 4.4 Season clock

Set 01 runs on a season clock with a visible end date.

**Flag:** with local-only saves, the season clock is the device clock, which is trivially manipulable. For Phase 2 this is acceptable — there is nothing to cheat *for* until money exists. Derive the season from a fixed epoch constant in `balance.ts` rather than from stored state, and move it server-side in Phase 3 alongside payments.

---

## 5. Packs

### 5.1 Structure

A pack is **5 cards**. Slots 1–3 roll Common/Rare. Slot 4 guarantees Rare or better. Slot 5 is the hit slot.

| Slot | Common | Rare | Epic | Secret |
|---|---|---|---|---|
| 1–3 | 82% | 18% | — | — |
| 4 | — | 88% | 12% | — |
| 5 | — | 70% | 26% | 4% |

Finish rolls independently per card: **Matte 87% / Foil 11% / Prism 2%.** Epic and Secret ignore this and use their own fixed finishes.

**Pity: a Secret is guaranteed within 40 packs.** Track the counter in the save and show it once the player is past pack 25 — a visible floor converts a dry streak from a reason to quit into a reason to open one more.

**Odds are displayed on the pack screen itself**, not buried in a menu. Both app stores require this the moment money touches it, and doing it now costs nothing.

### 5.2 Sources

| Source | Rate |
|---|---|
| Free pack timer | 1 per **12 hours**, cap 2 stored |
| Pack progress from play | Every catch contributes; ~6 catches fills a bonus pack |
| Streak rewards | See §6 |
| Set completion, milestones | Fixed grants |

The 12-hour timer and the 12-hour Spark refill are deliberately aligned: **the game asks for a morning session and an evening session.** Sparks gate catching, the pack timer gates pulling, and they refill on the same rhythm so neither becomes the sole bottleneck.

### 5.3 The opening is the feature

Card-by-card reveal, tap or swipe to advance, held beat before the hit slot, escalating treatment by rarity, distinct audio and screen response for Foil / Prism / Secret. New cards are marked as new; duplicates show the shard value they convert to so a dupe is never a blank.

**This gets real production budget.** It is the moment the player screenshots, and §8 hangs off it directly. Do not bury it behind a shop that does not exist yet.

---

## 6. Daily return

This is the actual hole in Phase 1. Nothing here is optional.

### 6.1 Simplification from the memo

The memo lists a free pack timer, a daily pack, and a daily Card Signal — that is three overlapping random-reward systems competing for the same attention, and it will read as noise.

**Collapsed into two:**

1. **The pack timer** (§5.2) — the ambient, always-running one. Ready twice a day.
2. **The daily claim** — one deliberate tap that requires opening the app on that calendar day. This is the streak driver.

The "daily Card Signal" is folded into the daily claim's reward table. One less system, same number of pulls.

### 6.2 Streak

- Increments on the daily claim. Resets at local midnight.
- **Missing a day pauses the streak; it does not reset it.** Reset-on-miss produces quit-on-miss — the player who breaks a 12-day streak on day 13 does not start again at one, they uninstall.
- 7-day cycle: escalating Stardust, then shards, then a guaranteed pack on day 7.
- **The day-7 reward is visible from day 1.** The streak display shows what is coming, not just what was earned.
- Clock guard: day boundaries advance forward only, same pattern as `regenerate()`. A player who moves their clock backward loses nothing and gains nothing.

### 6.3 The empty state is a retention surface

When Sparks hit zero and the pack timer is running, the app must not be a dead screen. Show the exact time to the next Spark and the next pack, and route the player to something free: the binder, the display case, sorting, favoriting, the share card. **A dead-end empty state is where uninstalls happen.**

---

## 7. Stardust — sinks before sources

Stardust currently accumulates with nowhere to go. No new source ships until the sinks do.

### 7.1 Shards

Duplicates convert automatically: **Common 1 / Rare 3 / Epic 8 / Secret 25.** Shard costs to craft a specific card: **Common 12 / Rare 40 / Epic 110 / Secret 300.**

The player nominates a target card and watches a meter fill toward it. Deterministic progress behind a random source is what stops a bad pull from feeling like nothing.

### 7.2 Sinks

| Sink | Cost | Note |
|---|---|---|
| Craft a card | Shards, above | The main sink |
| Reroll a duplicate's finish | 250 Stardust | Cosmetic gamble, no power. Dupes become interesting. |
| Display frame | 400–1,200 Stardust | Cosmetic, earnable, mirrors a paid tier |
| Skip pack timer | 300 Stardust | Convenience only, capped at once per day |
| Extra Spark | 150 Stardust | Convenience only |

At roughly 400–600 Stardust of daily income, every sink is reachable and none is trivial. That gap is the space §9 lives in.

---

## 8. Share card

**Built before the shop, not after.** With no UA budget, organic sharing is the distribution plan.

- Every catch and every Foil / Prism / Secret pull offers **Share**.
- Renders a **1080×1920 (9:16)** image on canvas: the card at full bleed with its finish treatment baked in, the set number, the player's chosen display name, and a small Starlets wordmark.
- Web Share API where available, download fallback everywhere else.
- Also shareable: a completed binder page, and the display case as a three-card layout.

**Flag:** with no backend there is no link attribution and no install tracking — this is organic reach with no measurement. Accept it for Phase 2, add a link and a referral code when the server lands.

---

## 9. Monetization skeleton

**Designed and built now, charged later.** Every SKU is purchasable in the UI, grant logic runs, analytics fire, a mock provider stands in for the processor. Real payments require the backend in §10.4 and are Phase 3.

| SKU | Price | Contents |
|---|---|---|
| **Season Pass** | $9.99 / season | Second pack timer (2 free packs per 12h instead of 1), one exclusive alt-art card per month, a display frame, streak insurance for one missed day |
| **Set-week bundles** | $4.99 – $19.99 | Fixed, fully visible pack counts plus a named card. No randomized contents. |
| **Display cosmetics** | $1.99 – $7.99 | Frames, binder skins, case backdrops. Pure margin, zero balance effect. |
| **Spark refills** | $0.99 | Convenience only |

### Hard rules

- **Never sell catch power.** No paid accuracy, no wider Perfect window, no extra tethers, no Signal Lock advantage of any kind. The skill verb stays clean or the whole thing reads as pay-to-win.
- **Never sell a random pull in Phase 2.** Paid randomized packs are the highest-ceiling and most regulated mechanic in the genre — banned in Belgium, restricted in the Netherlands, odds-disclosure mandated by both stores. Ship the deterministic economy, get real conversion data, revisit in Phase 3 with a hard pity floor and published odds.
- **No purchase prompt after a failed catch or a bad pull.** Converts marginally, generates refunds and one-star reviews.
- **No countdown on an offer that is not actually limited.**
- Season Pass appears after the first completed binder page, not during onboarding.

---

## 10. Technical work

### 10.1 Save migration

`starlets.phase1.v1` → `starlets.phase2.v1`. New state: owned cards keyed by card ID with per-finish counts, shard balances, pack inventory and timer, pack pity counter, streak and last-claim date, display case selection, owned cosmetics, set progress, season epoch.

Write a real forward migration — Phase 1 catch records map cleanly to default-card ownership. Do not discard playtest saves. Extend `parseSave` to cover every new field at the same strictness it has today; that function is the best code in the repo and its standard does not drop.

### 10.2 Refactor

Split `app/page.tsx` into: Scan, Binder, Packs, Case, Settings. Signal Lock becomes its own module. All game logic stays pure in `lib/` — the existing separation between `lib/game.ts` and the UI is the thing that makes this codebase workable, and it holds.

Navigation drops from the old five-destination plan to **four**: Scan, Binder, Packs, Case.

### 10.3 Tests

Extend `lib/game.test.ts`, same deterministic pattern with injected `rng` and `now`: pack roll distribution and slot guarantees, pack pity at the 40 floor, finish roll rates, duplicate-to-shard conversion, craft costs and affordability, streak increment / pause / clock-manipulation, pack timer accrual and the 2-cap, every Stardust sink, set completion detection, and Phase 1 → Phase 2 save migration.

### 10.4 Backend — Phase 3, decided now

Real payments need a server, and so does cheat prevention: today a player can edit localStorage and grant themselves a Secret, which is harmless until money exists and unacceptable the moment it does.

Cloudflare **D1** and **R2** bindings are already declared in `vite.config.ts` and unused. Structure Phase 2 save state so moving it server-side is a transport change, not a rewrite.

### 10.5 Analytics

Instrument from day one of Phase 2 or the data is gone permanently. Minimum: session start, scan, catch result by quality, pack opened, cards pulled by rarity and finish, binder viewed, set page viewed, share tapped, share completed, streak claimed, streak broken, every sink spend, offer viewed, offer dismissed, mock purchase.

**D1 / D3 / D7 retention must be measurable the day the first playtester touches the build.** Everything in §12 depends on it.

---

## 11. Build order

1. Section 2 in full — commit, art, delete `Potential`, lock Sparks, split `page.tsx`, WebP, private deploy.
2. Card data model and Set 01 content.
3. Binder — pages, silhouettes, completion meters.
4. Card detail slab and finish rendering.
5. Save migration.
6. Pack opening — rolls, pity, reveal sequence.
7. Pack timer and pack progress from catches.
8. Duplicates → shards → craft.
9. Daily claim and streak.
10. Remaining Stardust sinks.
11. Display case and frames.
12. Share card renderer.
13. Analytics.
14. Shop and SKUs, payments stubbed.

Items 1–4 are the product. Items 5–10 are the loop. Items 11–14 are distribution and the wallet. Do not reorder to reach the fun parts first — the binder is meaningless without the migration, and the pack is meaningless without something to be missing.

---

## 12. Definition of done

Not "four screens exist." Phase 2 is done when:

- a first-day session includes opening a pack **or** looking at the binder;
- a player can see a specific, named, incomplete page and knows exactly which slots are empty;
- Stardust can actually be spent, on more than one thing;
- there is a concrete reason to open the app 24 hours later, and the app says what it is before the player closes it;
- a pull can be shared as an image in two taps;
- and **we can record whether they came back** — D1, D3 and D7 measured, not guessed.

---

## 13. Handoff rule

Anything not explicitly locked above is a configurable placeholder. Every tunable number — pack odds, finish rates, pity floors, shard costs, sink prices, timer durations — lives in `lib/balance.ts`, never in UI logic. If a value will be argued about after a playtest, it does not belong in a component.

---

## 14. Open items

1. **Species count for Set 01 — three or six.** See §4.2. My recommendation is six; the cost is illustrations, which is the resource we have. Content decision, can be made late.
2. **Season length.** 4, 6 or 8 weeks. Shorter drives urgency and burns content faster. 6 weeks is the genre default and is what I would start with.
3. **Display name.** The share card needs one, and there are no accounts. Locally-entered name for Phase 2, claimed properly when the server lands.
4. **Art pipeline throughput.** 27 cards plus three finish treatments is the critical path for Phase 2 and the one thing on this list that code cannot unblock. Worth a realistic weekly rate before the build order is scheduled.

No partner or external commitments conflict with anything above.
