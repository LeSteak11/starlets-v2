# Starlets — active Phase 2 plan

**Updated:** September 6, 2026

**Status:** Active execution plan

**Objective:** Make a player return, pull something they value, and care about an incomplete binder page.

This plan starts from the implementation on `flip-binder-packs`. It replaces earlier Phase 2 drafts where they conflict. Current behavior and known defects are documented in `DAY-3-CURRENT-STATE.md`.

## Locked direction

- Cards, binder pages, timed packs, and Signal Lock form the product core.
- Every completed flip grants one card. There are no failed catches or Familiarity progression.
- The first owned card for a species discovers it. Packs may discover unseen species.
- Signal Lock keeps the displayed species; skill influences its printing.
- Set 01 remains eight Starlets, 27 numbered cards in three zone pages, and three unlisted secrets.
- Grove, Tide, and Flare are identity and organization only.
- Saves remain local for this phase, with server ownership required before real payments.
- All tunable values live in `lib/balance.ts`.

Battles, combat stats, Potential, Core matchups, Habitat, GPS, raids, chat, trading, and an 18-species roster are outside the active Phase 2 scope. Older concepts such as Starbond, Starguides, Star Rise, Star Marks, and companion selection are not current commitments.

## Work order

### 1. Stabilize the existing collection loop

- Define and enforce one secret-guarantee rule across Signal Lock and packs.
- Route version-2 current-key saves through migration without discarding progress.
- Preserve a monotonic pack-timer anchor through device-clock rollback.
- Return per-slot pack outcomes so NEW, duplicate rewards, and analytics are accurate.
- Complete the remaining interface-copy audit.

Exit: behavior, counters, tests, and player-facing promises agree; supported saves load.

### 2. Make duplicates useful

- Let the player nominate and craft a specific missing card with shards.
- Define craft costs for the actual five-rarity model.
- Add at least two useful Stardust sinks with clear prices and limits.
- Show progress toward the selected card.

Exit: every duplicate advances a reachable collection goal, and Stardust has more than one use.

### 3. Make tomorrow explicit

- Add one daily claim with a visible seven-step reward track.
- Missing a day pauses progress rather than erasing it.
- Define local-day boundaries and forward-only clock behavior.
- Add bonus-pack progress only after the spending economy is stable.

Exit: the app shows what the player can earn by returning and when it becomes available.

### 4. Make cards worth displaying

- Produce six missing creature sprites and 30 card faces.
- Start with Emberpanda and the tutorial base cards, then finish one binder page.
- Open binder slots into an exact-card detail view with title, finish, copies, date, and favorite control.
- Render foil, fullart, and secret treatments from authored metadata.

Exit: one complete art slice can be judged as a collectible product.

### 5. Add display and sharing

- Add a three-card display case, frames, favorites, and a local display name.
- Export a 1080×1920 card, completed page, or display-case image.
- Use native sharing where available and file download as fallback.

Exit: a notable pull can be shared in two taps.

### 6. Make the playtest observable

- Add durable events for sessions, flips, grants, binder views, crafting, spending, claims, sharing, and offers.
- Establish a stable anonymous identity suitable for return cohorts.
- Deploy a private playtest URL and verify the release artifact.

Exit: D1, D3, and D7 return behavior can be measured.

### 7. Prototype deterministic offers

- Add fully visible mock offers only after collection, sinks, and analytics work.
- Keep grant logic separate from the future payment provider.
- Do not charge real money in Phase 2.

Exit: offer views and mock conversions can be assessed without payments.

## Open decisions

1. The exact secret guarantee, including species without secret printings.
2. Craft costs for Common, Uncommon, Rare, Legendary, and Secret.
3. The first two Stardust sinks; an independent finish reroll conflicts with the current fixed-finish model.
4. Whether a fresh account receives an immediately available pack.
5. Whether secrets count toward set completion and the completion reward.
6. Season duration and epoch.
7. Display-name rules.
8. Final names, art approval, and sustainable art throughput.
9. A coherent set of deterministic mock offers.

Any proposed number remains configurable until recorded here as locked and represented in `lib/balance.ts`.

## Phase 2 definition of done

- A first session reaches the binder or opens a pack.
- The player sees a named incomplete page and understands which slots are missing.
- Duplicates advance a selected goal.
- Stardust can be spent on more than one meaningful option.
- The next-day reward and its availability are visible.
- A notable pull can be shared as an image in two taps.
- A private build is accessible to playtesters.
- D1, D3, and D7 returns can be recorded.

Phase 2 is complete when the collection loop has value, return motivation, distribution, and measurement.
