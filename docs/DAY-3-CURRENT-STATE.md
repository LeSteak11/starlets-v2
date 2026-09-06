# Starlets — Day 3 current state and PM handoff

**Snapshot:** September 6, 2026 · **Project:** starlets-v2 · **Reviewed HEAD:** `67e2641`

Starlets has a functioning collection prototype with a scanner, skill-based card flips, a 30-card catalogue, three binder pages, and timed five-card packs. Phase 1 is implemented and the core of Phase 2 is implemented on a feature branch. Phase 2 is **not complete**, and this is not yet a release-ready or measured retention product.

The immediate job is to stabilize the existing loop, make the cards worth looking at, give duplicate rewards a use, and establish a measurable reason to return. Building combat or expanding the roster would distract from those gaps.

## 1. Where we left off

The last implementation landed just after midnight on September 6. It unified scanning and packs around one rule: **every completed flip grants a card**. The last commit cleaned up old catch language on the scan screen.

| Area                    | Current state                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Phase 1                 | Implemented; some original mechanics have since been replaced                              |
| Phase 2                 | Binder, packs, timer, duplicate shards, and event hooks implemented                        |
| Current branch          | `flip-binder-packs`, at `67e2641`                                                          |
| Main branch             | `7a78363`; the feature branch is 3 commits ahead                                           |
| Version history         | 11 commits reachable from current HEAD                                                     |
| Working directory       | Clean before this report was added                                                         |
| Remote                  | `https://github.com/LeSteak11/starlets-v2.git`                                             |
| Remote synchronization  | Local remote-tracking refs match both branches; no network fetch performed for this report |
| Hosting                 | Sites/Cloudflare configuration exists; no live deployment verified in this review          |
| Prior deployment report | Worker uploaded, but no workers.dev subdomain/usable URL; deployment deferred              |
| Art readiness           | 2 provisional creature sprites; **0 of 30 card illustrations** present                     |
| Saves                   | Browser-local, version 3; no account or cloud save                                         |
| Revenue                 | No shop, purchase flow, payment integration, or revenue measurements                       |
| Validation              | Prior report says 20/20 tests, typecheck, lint and content check passed; not rerun here    |

“Merged flip” in a commit title describes the gameplay unification. It does **not** mean the feature branch has been merged into main.

### Scope and evidence

This report reconciles the source files, local Git history, all four repository docs, README, the original external developer plan, and relevant accessible project task history. Source inspection is the basis for current implementation claims. Prior test/browser/deployment reports are labeled historical; new code findings below are inspection findings, not reproduced browser defects.

The earlier instruction to leave further testing to the owner was found in project history and README. No tests, production build, browser playtest, deployment, or gameplay changes were performed for this documentation task. External character-design conversations and assets outside the reviewed project/planning context are not treated as integrated deliverables. There is no claim that every historical ChatGPT design image has been recovered.

## 2. Product direction and decisions

**Audience:** approximately ages 13–28, per the owner's explicit correction in the implementation task. The original kid-oriented wording is outdated.

**Presentation:** mobile-first, dark lunar observatory; luminous signals, creature discovery, collectible printings. Launch world is **Lunara**. Set 01 is **Lunara: First Light**, ID `LUN-01`.

**Current loop:** Scan → spend a Spark to enter Signal Lock → complete four tethers → receive a printing of that same creature → fill collection slots → return for free packs and more Sparks.

| Decision            | Current interpretation                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| Starlet versus Card | Starlet is the species; Card is a collectible printing                            |
| Discovery           | First card of a species, from any source, discovers that species                  |
| Failed catches      | Removed; even four misses award a card                                            |
| Familiarity         | Removed from current save/gameplay; an unused balance constant remains            |
| Quality             | Changes requested rarity band, then snaps to a printing the species actually has  |
| Species identity    | The creature in the ring never changes as a result of quality                     |
| Cores               | Grove, Tide, Flare are visual identity/taxonomy; no combat matchup effect         |
| Roster              | Eight species in the current locked set; names/art still provisional              |
| Intro               | Mossbun → Emberpanda → Novafox; free, scripted base-card rewards                  |
| Secrets             | Three unnumbered cards outside the three numbered pages                           |
| Ownership           | Exact card IDs and copy counts; duplicates also award shards                      |
| Finishes            | Fixed metadata per card: matte, foil, fullart, secret; no independent finish roll |
| Payments            | Deferred; current app has no monetization implementation                          |

Earlier plans included Star Trials, combat stats, Potential, Core matchups, Habitat, and an 18-creature requirement. The Phase 2 pivot explicitly cuts those from the active build. GPS, raids, chat and trading are also outside this scope. Starbond, Starguides, Star Rise, Star Marks, companion selection and the original Signal Market survive as historical design ideas, **not implemented or scheduled Phase 2 commitments**. Reactivating any requires a deliberate scope decision.

## 3. What the player can do today

| Surface/system | Implemented                                                                                 | Missing or limited                                                                               |
| -------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Scan           | Mystery signal, weighted species encounters, free preview, one-time Spark spending          | No selectable zone or planet filtering; all species share one weighted pool                      |
| Signal Lock    | Four moving-target tethers, Perfect/Good/Miss, pause/visibility guard, slower timing option | Human confirmation of current feel remains pending                                               |
| Result         | Awarded printing, rarity, rewards, discovery/duplicate information                          | No polished card slab or sharing                                                                 |
| Binder         | Three 3×3 pages, next/previous buttons, page progress, numbered empty slots, copy counts    | No swipe implementation, filters, sorting controls or favorites UI                               |
| Chase tray     | Three separate unlisted secrets, ownership count                                            | Not a hidden unknown-size secret pool; UI exposes three entries                                  |
| Card selection | Opens corresponding species detail dialog                                                   | Not a detail view of the selected exact card                                                     |
| Packs          | Five cards granted at opening; sequential reveal; displayed slot odds                       | No sound/finish production treatment, bonus-pack progress or starter pack                        |
| Resources      | Sparks regenerate; Stardust and shards accrue                                               | No Stardust spending or shard crafting                                                           |
| Settings       | Slower timing, local save reset with confirmation                                           | No account/profile, display name or export/import save UI                                        |
| Persistence    | Local save, current encounter restoration, storage error messaging, cross-tab notifications | No transactional multi-tab protection or cloud synchronization                                   |
| Analytics      | Console events and replaceable sink                                                         | No durable collection, user/session identity, cohort reporting or D1/D3/D7 retention measurement |

Fresh saves begin with **zero packs**; the first free pack is 12 hours away. The intro normally leaves the player with three base cards, **9 Sparks** (overflow is retained), and **80 Stardust**, before any additional play or elapsed-time effects. This is the current first-session experience, not the full Welcome Constellation narrative.

## 4. Complete content inventory

### Species

| Starlet    | Core  | Zone         | Base rarity | Scan weight | Card count | Sprite           |
| ---------- | ----- | ------------ | ----------- | ----------: | ---------: | ---------------- |
| Mossbun    | Grove | Moon Garden  | Common      |          26 |          4 | Provisional WebP |
| Emberpanda | Flare | Prism Caves  | Common      |          24 |          6 | Placeholder      |
| Novafox    | Tide  | Crater Coast | Rare        |           9 |          3 | Provisional WebP |
| Dewlark    | Grove | Moon Garden  | Common      |          26 |          3 | Placeholder      |
| Shellune   | Tide  | Crater Coast | Uncommon    |           8 |          3 | Placeholder      |
| Cindermoth | Flare | Prism Caves  | Uncommon    |           6 |          4 | Placeholder      |
| Glimmerelk | Grove | Moon Garden  | Rare        |           1 |          3 | Placeholder      |
| Selenith   | Tide  | Crater Coast | Legendary   |         0.2 |          4 | Placeholder      |

Weights are relative, not percentages; total weight is 100.2. Tutorial order is scripted separately. Every species has a name, Core, zone, color, signal style, speed, lore and signature name. Signature names are flavor metadata, not functioning moves.

### All 30 cards

Numbered IDs use `LUN-01-` plus the three-digit number; secret IDs are `LUN-01-S1`, `S2`, `S3`. All card illustrations below are missing, all illustrator fields are `TBD`, and all content versions are 1.

| No. | Starlet    | Printing            | Rarity    | Finish  |
| --- | ---------- | ------------------- | --------- | ------- |
| 001 | Mossbun    | Base                | Common    | Matte   |
| 002 | Mossbun    | Garden Drift        | Common    | Matte   |
| 003 | Mossbun    | Moss Light          | Uncommon  | Foil    |
| 004 | Mossbun    | The Listening Field | Rare      | Fullart |
| 005 | Dewlark    | Base                | Common    | Matte   |
| 006 | Dewlark    | Morning Chorus      | Common    | Matte   |
| 007 | Dewlark    | Dewfall             | Uncommon  | Foil    |
| 008 | Glimmerelk | Base                | Rare      | Matte   |
| 009 | Glimmerelk | Antler Dawn         | Legendary | Foil    |
| 010 | Novafox    | Base                | Rare      | Matte   |
| 011 | Novafox    | Tideline Sprint     | Rare      | Matte   |
| 012 | Novafox    | Comet Trail         | Legendary | Foil    |
| 013 | Shellune   | Base                | Uncommon  | Matte   |
| 014 | Shellune   | Low Tide            | Uncommon  | Matte   |
| 015 | Shellune   | Pearl Current       | Rare      | Foil    |
| 016 | Selenith   | Base                | Legendary | Matte   |
| 017 | Selenith   | Moonrise            | Legendary | Matte   |
| 018 | Selenith   | Crown of Lunara     | Legendary | Fullart |
| 019 | Emberpanda | Base                | Common    | Matte   |
| 020 | Emberpanda | Banked Coals        | Uncommon  | Matte   |
| 021 | Emberpanda | Long Night          | Uncommon  | Matte   |
| 022 | Emberpanda | Emberglow           | Rare      | Foil    |
| 023 | Emberpanda | Kiln Light          | Rare      | Fullart |
| 024 | Cindermoth | Base                | Uncommon  | Matte   |
| 025 | Cindermoth | Ash Bloom           | Rare      | Matte   |
| 026 | Cindermoth | Emberwing           | Rare      | Foil    |
| 027 | Cindermoth | Prism Wake          | Rare      | Fullart |
| S1  | Emberpanda | Nightwatch          | Secret    | Secret  |
| S2  | Glimmerelk | First Contact       | Secret    | Secret  |
| S3  | Selenith   | Night Slab          | Secret    | Secret  |

Page 1 is Moon Garden 001–009; page 2 is Crater Coast 010–018; page 3 is Prism Caves 019–027. Rarity totals: **5 Common / 7 Uncommon / 10 Rare / 5 Legendary / 3 Secret**. Roles: eight bases, eight poses, seven foils, four fullarts and three secrets. Finishes and roles are independent fields; the table above inventories finishes, not a second randomized collectible axis.

### Art production

There are 38 intended unique production assets: 30 card faces and eight creature sprites. Only Mossbun and Novafox sprites exist as creature art. Six species point to the same 558-byte placeholder. The old “8/38 assets present” result counts those six placeholder references as present assets; it does **not** mean eight finished illustrations.

Remaining art: **30 card faces + six sprites = 36 assets**. Existing sprites are 241,120 and 254,632 bytes, both below the code's 256,000-byte limit. Their final creative approval is not established by file presence.

Cards: `public/cards/lun01/001.webp` through `027.webp`, plus `s1.webp`–`s3.webp`; 1024×1434 portrait, full bleed, no baked-in UI frame. Sprites: 1024×1024 transparent WebP. Budget: 250 KiB per asset in code. Content lives in `content/set-01.ts`; IDs must remain stable to preserve saves.

## 5. Economy and randomness as implemented

| Resource/rule                      | Value                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| Starting Sparks / regeneration cap | 6 / 8                                                                             |
| Regeneration                       | 1 Spark per 90 minutes; 12 hours from empty to cap                                |
| Paid ring entry                    | 1 Spark; three intro entries free                                                 |
| Intro reward                       | +1 Spark each, allowed above cap                                                  |
| Free packs                         | One per 12 hours, maximum two stored                                              |
| Initial pack inventory             | Zero                                                                              |
| Last stored pack spent             | Timer resets to opening time; partial progress is discarded                       |
| Stardust per granted card          | Common 20; Uncommon 30; Rare 40; Legendary 160; Secret 240                        |
| Duplicate shards                   | Common 1; Uncommon 2; Rare 3; Legendary 8; Secret 25                              |
| Duplicate ownership                | Copy count increases as well as awarding shards                                   |
| XP bookkeeping                     | +50 first species discovery; +20 subsequent card grants; no active progression UI |
| Pity target/display                | Configured 40 flips, visible at 25; enforcement mismatch described below          |

| Pack slot | Common | Uncommon | Rare | Legendary | Secret |
| --------- | -----: | -------: | ---: | --------: | -----: |
| 1–3 each  |    72% |      28% |    — |         — |      — |
| 4         |      — |        — |  88% |       12% |      — |
| 5         |      — |        — |  68% |       28% |     4% |

Packs choose rarity, then uniformly choose a **card** at that rarity. They do not use scanner encounter weights. Consequently the rare scanner mascot is much easier to obtain from a legendary pack slot: Selenith owns three of the five legendary card entries. This is a balancing implication, not evidence of actual playtester behavior.

Ring quality scores Perfect=2, Good=1, Miss=0, divided by maximum possible points. Mid begins at 0.5; high at 0.85. Requested tables are low: 70% Common/30% Uncommon; mid: 55% Uncommon/45% Rare; high: 60% Rare/36% Legendary/4% Secret. Missing rarities snap to the nearest available rarity for that creature, ties toward the commoner side.

This makes quality less influential on some species: Novafox always awards Rare at low/mid quality; Selenith always awards Legendary at low/mid quality. High quality can still alter the outcome. The meter retains threshold 80 and gains 32/23/5 ±3, but **completion waits for four tethers and a card is awarded regardless of meter threshold**. The old four-Goods “catch guarantee” test no longer defines whether a card is won.

## 6. Engineering assets and persistence

| File/area                                | Responsibility                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/page.tsx`                           | Composition, navigation, resource display, optional read-only `read_starbook` browser bridge |
| `app/_hooks/use-save.ts`                 | Load/persist/reset, migration entry point, storage-event synchronization                     |
| `app/globals.css`, `app/layout.tsx`      | Responsive styling and application shell                                                     |
| `components/game/`                       | Scan, Signal Orbit, Binder, Packs and dialogs                                                |
| `components/ui/`                         | Five retained UI primitives: switch, progress, dialog, button, alert-dialog                  |
| `lib/game.ts`                            | Pure state transitions, awards, timer, save parsing and migration                            |
| `lib/flip.ts`                            | Quality bands, rarity snapping, pack rolls and pity logic                                    |
| `lib/balance.ts`                         | Tuning and species roster, including some inactive legacy values                             |
| `lib/cards.ts`, `lib/catalogue.ts`       | Types, lookups, page grouping and content integration                                        |
| `content/set-01.ts`                      | 30 authored card records; content separated from logic                                       |
| `lib/analytics.ts`                       | Four event types, timestamps, console sink and replaceable sink function                     |
| `lib/game.test.ts`                       | 20 named tests for core game/content rules                                                   |
| `scripts/content-check.ts`               | Content structure and asset validation                                                       |
| `scripts/content-art.ts`                 | Missing art, size budgets and orphan reporting                                               |
| `vite.config.ts`, `.openai/hosting.json` | Vinext, Sites and Cloudflare configuration                                                   |

Installed manifest: React 19.2.6, Vinext 1.0.0-beta.5, Vite 8.0.13, TypeScript 5.9.3, Tailwind 4.2.1, Wrangler 4.92.0. Node requirement is ≥22.13.0. These are repository versions, not claims about current recommended releases.

Commands available: `npm run dev`, `build`, `start`, `test`, `typecheck`, `lint`, `format`, `content:check`, `content:art`. Content checking is wired to **pretest**, not prebuild; a production build alone does not establish content validation. `.next`, `.vinext`, `.wrangler`, `dist`, dependencies and TypeScript cache exist locally as generated artifacts, not additional shipped features.

Save key: `starlets.phase2.v1`, schema version **3**. Legacy key: `starlets.phase1.v1`. Save includes resources, intro progress, species records, exact card copy counts, first-obtained metadata, favorite flags, pack timer/pity/open count, shards, active encounter and timing preference. Art/names/rarities resolve from the catalogue rather than being copied into saves.

The migration function supports v1 and v2, but the loading integration has the gap described below. Legacy migration clears in-flight encounters. Current-format encounters persist. Pack rewards persist immediately; the reveal cursor is component state and is lost on reload or leaving the screen, without undoing awarded cards.

Hosting config has a Sites project ID but **D1 and R2 are null**. Conditional scaffolding exists for them; no active database/bucket binding is established by these files. No backend endpoints, authentication, server clock or payment processor exist in the reviewed source.

## 7. Issues and documentation drift found in this review

These are actionable source-inspection findings. No gameplay fixes were made as part of this report.

| Priority           | Finding and impact                                                                                                                                                                                                                                                                                                                     | Next action                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P1                 | **40-flip guarantee is overstated.** Ring awards increment pity but never force a secret. Packs force only the fifth slot. Starting at pity 39 with ordinary low rolls gives four more nonsecret cards before the forced secret, at total flip 44. Ring-only play can exceed 40 indefinitely. UI can display negative flips remaining. | Settle the guarantee unit and enforce it consistently without violating the same-species ring rule; update tests and copy |
| P1                 | **v2 save loading bypasses migration.** When the current key exists, `useSave` calls version-3-only `parseSave` directly. A v2 save at that key errors despite the migration function supporting v2.                                                                                                                                   | Dispatch based on stored version at the real load boundary; preserve original data                                        |
| P1                 | **Retention cannot be measured.** Console timestamps without persistent events and stable identity cannot produce returning-player cohorts.                                                                                                                                                                                            | Add a minimal durable event path and identity before recruiting a retention cohort                                        |
| P2                 | **Clock rollback anchor moves backward.** `accruePacks` assigns `accruedAt = now` on rollback. Restoring the clock after persisting that state can mint time-derived packs. Existing test checks immediate inventory only.                                                                                                             | Preserve a monotonic accrual anchor and cover rollback then restoration                                                   |
| P2                 | **Same-card repeat reveal labels remain wrong.** `newSlots` stores card IDs and the UI uses `includes`. If a newly discovered card appears twice in one pack, both appearances can say NEW. Duplicate telemetry also compares every card with pre-pack ownership, missing duplicates created earlier in that pack.                     | Return per-slot grant outcomes and use them for reveal labels/events                                                      |
| P2                 | **Card click shows species, not printing.** Selected subtitle, finish, acquisition details and exact copy identity are lost.                                                                                                                                                                                                           | Build the planned card detail slab keyed by card ID                                                                       |
| Resolved in Pass 1 | **Art reporting previously overstated readiness.** It now separates production art, placeholders, and missing files.                                                                                                                                                                                                                   | Keep this distinction in future reports                                                                                   |
| Resolved in Pass 1 | **Obsolete UI promises remained.** The stale training and future pack/binder messages and inherited Packs heading were corrected.                                                                                                                                                                                                      | Recheck copy as behavior changes                                                                                          |
| Resolved in Pass 1 | **The content guide's append-029 recipe conflicted with fixed pages.** It now treats expansion as a coordinated set change.                                                                                                                                                                                                            | Keep page validation aligned with future set changes                                                                      |

Additional limitations: cross-tab synchronization is best-effort, not atomic; all clocks and balances are client-controlled; pack opening animation cannot resume; empty binder art is a generic placeholder rather than creature-specific missing-card silhouettes. These matter for polish and future services but do not require a platform rewrite for this prototype.

### Documentation status after the Pass 1 cleanup

- **README:** now describes the current collection prototype, commands, limitations, and document hierarchy.
- **APP-STATUS:** now provides a concise current snapshot and explicitly lists unresolved behavior defects.
- **PHASE-2-PLAN:** now contains only the active collection-first scope, ordered work, open decisions, and exit criteria. The superseded proposal has been removed from the active plan.
- **DEV-BRIEF-CONTENT-LAYER:** historical completed refactor ticket; 28-card assumptions predate the current 30-card set.
- **CONTENT-GUIDE:** now explains that expanding the set is a coordinated page change, clarifies which command invokes validation, and distinguishes production art from placeholders.

Until these are reconciled, use **current source for behavior**, this dated report for project state, and label proposed plan values explicitly. Do not interpret contradictory paragraphs as additional approved scope.

## 8. Remaining Phase 2 backlog

| Workstream      | Remaining work                                                                    | Dependency/PM position                                                        |
| --------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Reliability     | Pity, integrated migration, timer rollback, reveal/event correctness              | First implementation slice                                                    |
| Cards           | 30 illustrations, six missing sprites, exact-card slab, finish visuals, favorites | Start with Emberpanda and tutorial base cards, then one complete page         |
| Duplicate value | Craft a chosen missing card, costs, affordability and target progress             | Needed before increasing reward volume                                        |
| Stardust sinks  | More than one useful spend, with prices and limits in balance data                | Pick supported sinks; finish rerolls conflict with current fixed-finish model |
| Daily return    | One daily claim, visible seven-step rewards, pause-on-miss progression            | Specify calendar boundary and clock behavior; connect rewards after sinks     |
| Bonus packs     | Progress from flips, milestones and claims                                        | Planned, not implemented; tune only after economy review                      |
| Completion      | Numbered-page/set reward definition, grant once, clear reward preview             | Resolve whether secrets count; old Prism reward has no current model          |
| Display         | Three-card case, frames, favorites, display name                                  | After exact-card slab                                                         |
| Sharing         | 1080×1920 image; card/page/case export; native share and download fallback        | Art and display metadata required                                             |
| Measurement     | Durable session, flip, grant, binder-view, spend, claim, share and offer events   | Before retention playtest; first binder entry currently lacks its own event   |
| Shop prototype  | Deterministic mock offers, grant logic and offer/purchase events                  | After collection, sinks and share; no real charging                           |
| Hosting         | Working private playtest URL and release verification                             | Historical blocker unverified today; separate from report delivery            |

Historical proposal values, **not implemented or newly approved**: Common/Rare/Epic/Secret craft costs 12/40/110/300; finish reroll 250 Stardust; frame 400–1,200; timer skip 300 once/day; Spark 150. These must be translated to the actual Common/Uncommon/Rare/Legendary/Secret and fixed-finish model before use.

The old commercial sketch lists a $9.99 season pass, $4.99–$19.99 bundles, $1.99–$7.99 cosmetics and $0.99 Spark refills. No corresponding SKU files or flows exist. A pass granting more randomized timer packs conflicts with the same plan's deterministic-purchase rule, and streak insurance has unclear value when missed days already pause progress. Resolve the product contradictions before implementation. Legal/store statements in older plans were not researched or validated by this project audit.

Open decisions: precise pity promise; named set-completion reward; current-rarity crafting costs; which first two Stardust sinks; initial pack availability; season length/epoch; display name; art production capacity and final naming; coherent mock commercial offers. Proposed answers should be recorded once rather than layered onto stale plan paragraphs.

## 9. Day 3 plan and acceptance gates

**PM recommendation:** prioritize one stable, understandable collection loop over a larger feature count. These are ordered work packages, not a claim they all fit in one day.

1. **Stabilize the existing branch.** Fix the two P1 gameplay/save findings, rollback accounting and per-slot reveal metadata. Reconcile user-facing copy and the working spec. Exit: guarantees match behavior; existing saves load; duplicates report correctly.
2. **Owner playtest and branch handoff.** Use the checklist below, then finish the appropriate validation/merge workflow. Exit: current Signal Lock experience accepted and the core branch is ready to become the baseline.
3. **Make duplicates useful.** Implement selected-card crafting and a clear shard target. Add supported Stardust sinks before daily reward inflation. Exit: a duplicate visibly advances a reachable chosen goal.
4. **Make tomorrow explicit.** Add the daily claim and paused streak/reward track. Exit: player can see exactly what returning earns and when.
5. **Advance art as its own production track.** Owner/content artist supplies approved Emberpanda sprite and tutorial card faces, then one complete page. Developer integrates exact-card presentation. Exit: at least one coherent collection slice can be assessed visually.
6. **Prepare an observable private playtest.** Establish the hosted URL and durable events before gathering retention evidence. Exit: a second-day return is identifiable and reportable.

Suggested ownership: PM maintains scope, decisions and acceptance; developer owns rule fixes, persistence, screens and telemetry; owner/content artist owns names and illustrations; owner/playtesters validate feel. No team availability or delivery dates are assumed.

### Owner playtest checklist

- Complete Mossbun, Emberpanda and Novafox intros. Expect three base cards, free entries, one Spark each and 80 total Stardust before extra play.
- Begin an ordinary encounter. Confirm exactly one Spark is spent. Deliberately miss all four tethers: a card of the displayed species should still be awarded.
- Try a high-quality encounter and slower timing. Note whether quality feedback and the reward relationship make sense.
- Refresh mid-encounter and on a result. Confirm the same encounter/reward and no refunded Spark or double grant.
- Browse all three binder pages and the secret tray on a phone-sized screen. Name the next specific card/page you want.
- Open an available pack. Confirm five grants, copy counts, and page changes. Pay attention to repeats and NEW labels. A fresh save requires waiting 12 hours; use an existing eligible playtest save rather than resetting valuable progress.
- Leave a reveal and reopen the binder: all five cards should already be owned even though the reveal sequence cannot resume.
- At zero Sparks, check that the next resource timing is understandable and the binder remains accessible.
- Report: what was confusing, what felt repetitive, and whether you wanted another flip without prompting.

After fixes, regression coverage should target actual gaps: v2 through the load hook, pity across mixed sources and boundaries, rollback then restoration, and repeated identical cards in one pack. Historical passing tests do not close those gaps.

### Phase 2 exit criteria

The prior plan's useful criteria remain: the first session reaches the binder or a pack; a player understands a named incomplete page; Stardust can be spent on more than one thing; tomorrow has a visible reward; a pull can be shared as an image in two taps; and D1/D3/D7 return behavior can actually be recorded. Current implementation satisfies only parts of these criteria. No completion percentage, retention rate or conversion forecast is justified by the available evidence.

## 10. History and source map

| Commit    | Milestone                                             |
| --------- | ----------------------------------------------------- |
| `4cee66e` | Phase 1 scanner, Signal Lock, Sparks and Starbook     |
| `04f2b12` | Initial eight-species/28-card set lock, later revised |
| `b1945d3` | Template pruning and WebP cleanup                     |
| `1e53a07` | Content/logic separation                              |
| `c5254cc` | Screen split and roster counting                      |
| `eafb9cd` | Three nine-card pages, unlisted secrets               |
| `9a38acc` | Earlier status rewrite                                |
| `7a78363` | Catch-model plan correction; current local main       |
| `8c6f96f` | Unified flip, binder, packs, timer and events         |
| `ab330a0` | Recent APP-STATUS rewrite                             |
| `67e2641` | Scan copy cleanup; reviewed feature-branch HEAD       |

Repository records: [APP-STATUS.md](APP-STATUS.md), [PHASE-2-PLAN.md](PHASE-2-PLAN.md), [CONTENT-GUIDE.md](CONTENT-GUIDE.md), [DEV-BRIEF-CONTENT-LAYER.md](DEV-BRIEF-CONTENT-LAYER.md), and README. Their historical statements are subject to the corrections above.

Original concept plan: `C:/Users/jakeb/Documents/Codex/2026-09-04/i-x20/outputs/Starlets_Dev_Plan_Final.md`. This preserves the earlier progression/battle/Guide design; it is superseded for the active collection-first scope.

Related tasks reviewed: **“Clarify plan execution questions”** (audience, Phase 1 authorization, user-led testing); **“Define Starlets core game loop”** (original concept and developer plan); **“analyze what we have, phase 1 complete, send me a message i…”** (accessible history contains the handoff request). No separate complete PM backlog, art approval log, release record, user research results or commercial metrics were found in the reviewed material.

**Next concrete handoff:** stabilize the existing collection branch, then implement crafting and useful spending while the owner produces the first coherent art slice. Daily rewards and measurable private playtesting follow; combat remains outside the active plan.
