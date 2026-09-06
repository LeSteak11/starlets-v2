# Starlets — Application Status

**Project:** `starlets-v2` · [LeSteak11/starlets-v2](https://github.com/LeSteak11/starlets-v2)
**Phase:** 1 complete. Phase 2 foundations complete; Phase 2 features not started.
**Date:** 2026-09-06
**Verified against:** the source, not the plan. Every claim below was read out of the repository or produced by running it.

---

## 1. Where the project actually is

The playable game is still the Phase 1 loop: scan, play the Signal Lock timing
minigame, catch a Starlet, see it recorded. That loop works end to end,
survives a reload mid-encounter, and is covered by passing tests.

What changed since Phase 1 is underneath it. The project is now in version
control, the card catalogue exists as data with a validated content pipeline,
the save format understands per-card ownership with counts, and the UI has been
broken into screens. **None of that is visible to a player yet** — there is no
binder, no packs, no daily return, and nothing to spend Stardust on.

The honest read: the foundations Phase 2 needs are in place and the features
Phase 2 promises are not. A player today sees eight silhouettes and three
tutorial catches.

| | |
|---|---|
| **Playable** | Yes, locally at `localhost:3000` |
| **Deployed** | No — worker uploaded, no `workers.dev` subdomain registered |
| **Tests** | 15/15 passing · typecheck and lint clean |
| **Version controlled** | Yes — 6 commits, pushed |
| **Accounts / backend** | None by design |
| **Monetization** | None |
| **Card art** | 8 of 38 assets present (2 sprites, 0 card faces) |

---

## 2. Stack

Next-style app on `vinext` 1.0.0-beta.5 (Vite), React 19, TypeScript,
Tailwind 4, Base UI via shadcn. Deploy target is Cloudflare Workers. Node 22+.

Dependencies are down to 11 from 19. UI components are down to 5 from 60 —
only what the app actually reaches. D1 and R2 bindings are declared in
`vite.config.ts` and unused; they are for Phase 3.

Scripts: `dev` `build` `start` `test` `typecheck` `lint` `format`
`content:check` `content:art`.

---

## 3. What a player can do

- Scan for a signal, spending 1 Spark (the three tutorial encounters are free)
- Play Signal Lock: four tethers against a moving target, Perfect / Good / Miss
- Catch or fail; failure banks 25 Familiarity, and 100 Familiarity guarantees
  the next encounter with that species
- Earn Stardust per catch, by species rarity
- Browse the Starbook: 8 slots, silhouettes for the undiscovered, a detail
  dialog per species
- Toggle slower Signal Lock timing; reset the save

**What a player cannot do:** open a binder, open a pack, spend Stardust, own
anything but base cards, come back for a daily anything, or share a pull.

### Catch maths, as built

Threshold 80. Perfect 32, Good 23, Miss 5, each ±3 variance.

| Tethers landed | Worst case |
|---|---|
| 4 hits, any mix of Good/Perfect | caught |
| 3 hits, 2+ Perfect | caught |
| 3 hits, 0–1 Perfect | escapes |
| 2 or fewer | escapes |

Four Goods at worst-case variance total exactly 80 against a threshold of 80 —
the guarantee holds on a `>=` and nothing more. **Any change to Good, variance
or threshold silently breaks it.** Worth pinning with a test before those
numbers are ever tuned.

---

## 4. Content — Set 01 "Lunara: First Light"

**8 Starlets, frozen.** Species count does not rise until the binder and the
pack timer exist.

| # | Starlet | Zone | Core | Base rarity | Cards |
|---|---|---|---|---|---|
| 001 | Mossbun | Moon Garden | grove | common | 4 |
| 002 | Emberpanda | Prism Caves | flare | common | 5 + secret |
| 003 | Novafox | Crater Coast | tide | rare | 3 |
| 004 | Dewlark | Moon Garden | grove | common | 3 |
| 005 | Shellune | Crater Coast | tide | uncommon | 3 |
| 006 | Cindermoth | Prism Caves | flare | uncommon | 4 |
| 007 | Glimmerelk | Moon Garden | grove | rare | 2 + secret |
| 008 | Selenith | Crater Coast | tide | legendary | 3 + secret |

Mossbun, Emberpanda and Novafox are the three tutorial catches. Selenith is the
set boss and is deliberately not one of them — the scan pool is
rarity-weighted so it stays a silhouette.

**27 numbered cards in three fixed 3×3 pages**, one page per zone: Moon Garden
001–009, Crater Coast 010–018, Prism Caves 019–027. Zones are scan flavour and
page identity, not a separate collection type.

**3 secrets, unlisted** — `number: null`, no binder slot, no counter on the
face. A chase tray, not a fourth page with one card on it.

Rarity spine: **5 common / 7 uncommon / 10 rare / 5 legendary / 3 secret.**
Every species has exactly one base card — the slot a catch fills. Alts may
outrank their base. Every secret is a printing of somebody already in the book.

Names and art are placeholders pending design. The rarity spine is the lock.

---

## 5. Architecture

```
content/set-01.ts       DATA ONLY. 30 card literals. No functions.
lib/cards.ts            Types, lookups, helpers. Never holds a card.
lib/catalogue.ts        The one place content meets logic.
lib/balance.ts          Every tunable number. Roster lives here.
lib/game.ts             Pure save/encounter logic. No React.
scripts/                content:check, content:art
app/page.tsx            Composition: header, heading, nav, which screen.
app/_hooks/use-save.ts  Load, migrate, persist, cross-tab sync.
components/game/        Signal Lock, Scan, Starbook, dialogs.
```

The rule that matters: **`lib/cards.ts` never contains a card, and
`content/set-01.ts` never contains a function.** Design can add cards, titles,
rarities and art without opening `lib/`.

| File | Lines |
|---|---|
| `content/set-01.ts` | 553 |
| `lib/game.ts` | 356 |
| `lib/game.test.ts` | 322 |
| `components/game/scan-screen.tsx` | 252 |
| `app/page.tsx` | 227 |
| `lib/balance.ts` | 225 |

`app/page.tsx` was 889 lines before the split.

---

## 6. Save format

Key `starlets.phase2.v1`, version 2, localStorage only.

Ownership is a flat `owned` map keyed by cardId with per-card `count`,
`firstObtainedAt`, `source` and `favorite` — so packs, shards and crafting have
somewhere to write. **Art, rarity, name and number are never stored**; they
resolve from the catalogue at read time, so re-arting a card or fixing a typo
leaves existing saves working.

Phase 1 saves at `starlets.phase1.v1` migrate forward automatically on load and
are never discarded. `parseSave` rejects anything malformed rather than
silently overwriting progress — including an owned card the catalogue does not
recognise.

---

## 7. Content pipeline

`npm run content:check` validates authored content and reports every problem at
once with the card number and field name. It runs as `pretest`.

**Errors** (fail the build): duplicate cardIds; gaps in numbering; `numberMax`
mismatch; a zone that is not exactly nine numbered cards in a contiguous run; a
species with anything other than one base card; an unknown `speciesId`; a
`core`/`zone` that disagrees with its species; an invalid rarity, finish or
role; a numbered secret or an unlisted non-secret; any asset over 250 KB.

**Warnings** (never block): missing art — the placeholder renders and work
continues; rarity counts drifting from the design target, which is a target to
balance against rather than a tripwire.

`npm run content:art` reports the asset picture on its own: missing, over
budget, orphaned files, total weight.

Art specs and the full field reference are in `docs/CONTENT-GUIDE.md`.

---

## 8. What is not built

Everything in `PHASE-2-PLAN.md` from the binder onward:

- **Binder** — pages, silhouettes, per-page completion, sort and filter
- **Card detail slab** — full-bleed art, live finish treatment, no stats
- **Packs** — rolls, pity, the reveal sequence. Odds are in `balance.ts`
  (slots 1–3 roll common/uncommon and never rare; slot 4 is 88/12
  rare/legendary; slot 5 is 68/28/4 with secret; pity at 40, visible from 25)
  but nothing rolls them yet
- **Pack timer** and pack progress from catches
- **Duplicates → shards → craft**
- **Daily claim and streak**
- **Stardust sinks** — Stardust still accumulates with nowhere to go
- **Display case and frames**
- **Share card renderer**
- **Analytics** — nothing is instrumented; D1/D3/D7 cannot be measured
- **Shop and SKUs**

Deliberately cancelled, not deferred: Star Trials, combat stats, the Core
matchup triangle, abilities, Habitat, GPS, raids, trading. Potential is deleted
from the code. Cores survive as cosmetic identity only.

---

## 9. Liabilities

1. **Art is the critical path.** 27 card faces plus 3 secrets plus 6 catch
   sprites. No code unblocks this and nothing downstream looks finished
   without it.
2. **Not deployed.** The worker is uploaded but the account has no
   `workers.dev` subdomain, so there is no URL. Nobody but the owner can play
   it.
3. **Only 5 commons in the set.** Pack slots 1–3 will circulate a small pool.
   Mitigated by letting those slots roll uncommon; worth watching after a
   playtest.
4. **The 80-vs-80 catch guarantee** described in §3.
5. **No analytics.** Every day this ships without instrumentation is a day of
   retention data that cannot be recovered.
6. **Local-only saves** mean the clock is the device clock. Fine until money
   exists; a Phase 3 problem.

---

## 10. Commit history

```
eafb9cd  Rebalance Set 01 to three pages of nine, secrets unlisted
c5254cc  Split page.tsx into screens, and count the whole roster
1e53a07  Split the content layer so cards can be authored without touching lib/
b1945d3  Prune the template: 55 unused components, 8 deps, PNG art
04f2b12  Set 01 lock: 8 Starlets, 28 cards, one Lunara set
4cee66e  Phase 1: Starlets prototype (Signal Lock, Sparks, Starbook)
```

---

## 11. Next

Binder and packs ship together. A binder alone is 20 permanently empty slots
with no way to fill them; packs are what turn an empty slot into a promise.
Together they make the Phase 2 thesis testable end to end: pull, watch a slot
fill, see which page is still incomplete, come back in twelve hours.

Everything renders on placeholders, so the art and the build run in parallel.
