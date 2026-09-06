# Starlets — Application Status

**Project:** `starlets-v2` · [LeSteak11/starlets-v2](https://github.com/LeSteak11/starlets-v2)
**Branch:** `flip-binder-packs` (8 commits, pushed, not merged to `main`)
**Phase:** Phase 2 core loop built. Retention, sinks and distribution not started.
**Date:** 2026-09-06
**Verified against:** the source, not the plan. Every claim below was read out of the repository, produced by running it, or observed in the browser.

---

## 1. Where the project actually is

The game now has a loop a player can finish: flip for a card, watch a slot
fill, see which page is still incomplete, and be told when the next free pack
lands. That is the Phase 2 thesis, end to end, for the first time.

What it does not yet have is a reason to come back tomorrow beyond the pack
timer, anything to spend Stardust on, or a way to show anyone the pull. And
every card renders on a grey placeholder.

| | |
|---|---|
| **Playable** | Yes, locally at `localhost:5180` |
| **Deployed** | No — worker uploaded, no `workers.dev` subdomain registered |
| **Tests** | 20/20 passing · typecheck, lint and `content:check` clean |
| **Version controlled** | Yes — 8 commits, pushed |
| **Accounts / backend** | None by design |
| **Monetization** | None |
| **Card art** | 8 of 38 assets present (2 sprites, 0 card faces) |

---

## 2. The model, as built

**Catch-as-key is cut.** This is the change everything else hangs off.

- **Every flip grants a card.** There is no failed catch and no empty-handed
  encounter. `caught`, `guaranteed` and `wasNew` are gone from `Encounter`.
- **A Starbook slot fills the first time that `speciesId` reaches the table**,
  from any source — packs included. Owning a card is the record. There is no
  separate permission to collect a species.
- **Signal Lock is a flip with a skill ring, priced at 1 Spark.** Tether
  quality picks a band; the band is snapped to the nearest printing that
  Starlet actually prints. **The animal never changes.**
- **The 12-hour pack is the same flip without the ring.**
- **Zones weight page identity and scan flavour.** They are not keys.
- **The intro still scripts the first three flips**, so the Mossbun,
  Emberpanda and Novafox bases are guaranteed.

### Snap-to-nearest

Ties resolve toward the commoner side, so snapping never quietly promotes a bad
run. Verified for every species × every band — the granted card is always the
species in the ring.

| Species | Band asks for | Gets |
|---|---|---|
| Glimmerelk (rare, legendary, secret) | common | **rare** — it prints no common |
| Glimmerelk | legendary | legendary |
| Mossbun (common…rare) | secret | **rare** — snaps back down its own line |
| Selenith (legendary ×3, secret) | common | **legendary** |

**Consequence worth knowing:** on Glimmerelk and Selenith, a bad flip and a good
flip land in the same band. The ring only has real range on Mossbun, Dewlark,
Emberpanda and Cindermoth. Rare species are simply generous — which is the
trade that was chosen deliberately over letting a poor flip downgrade the
animal.

**Tuning change this forced:** four Goods scored 0.5 against a mid threshold of
0.55, so a clean four-tether run paid the *bottom* band. `bandAt.mid` is now
0.5.

### Signal Lock, unchanged

Threshold 80. Perfect 32, Good 23, Miss 5, each ±3 variance. Four Goods at
worst-case variance total exactly 80 against a threshold of 80 — the guarantee
holds on a `>=` and nothing more. **This is now pinned by a test** so the
numbers cannot move without the suite saying so.

---

## 3. What a player can do

- Flip via Signal Lock (1 Spark; the three intro flips are free) and always
  come away with a card
- Open a free pack — five cards, card-by-card reveal, one every 12 hours, two
  stored
- Browse the binder: three fixed 3×3 pages in card order, numbered silhouettes
  for empty slots, per-page completion, secrets in an unlisted chase tray
- See published pack odds on the pack screen, and the pity counter from flip 25
- Bank Stardust and shards; open a species detail dialog from any slot
- Toggle slower Signal Lock timing; reset the save

**What a player still cannot do:** spend Stardust on anything, craft a card,
claim a daily anything, build a streak, favourite or display a card, or share a
pull.

---

## 4. Content — Set 01 "Lunara: First Light"

Unchanged this push. **8 Starlets, frozen. 27 numbered cards in three fixed
3×3 pages** — Moon Garden 001–009, Crater Coast 010–018, Prism Caves 019–027 —
**plus 3 unlisted secrets** with no number and no slot.

Rarity spine: **5 common / 7 uncommon / 10 rare / 5 legendary / 3 secret.**

Page order is pinned by a test: page 1 opens on 001. The roster lists species
in Garden/Caves/Coast order, which had the binder opening on the wrong page
until pages were sorted by card number instead.

Names and art are placeholders pending design. Nothing in this push touched
card content.

---

## 5. Economy, as built

| | |
|---|---|
| **Sparks** | 6 start, 8 cap, one per 90 min. 1 per ring flip; intro flips free |
| **Free packs** | One per 12h, two stored. Opening the last one restarts the timer |
| **Stardust** | Paid per grant, by the **granted card's** rarity — not the species base |
| **Shards** | Minted only by duplicates: 1 / 2 / 3 / 8 / 25 by rarity |
| **Pity** | Secret guaranteed within 40 flips, counted across every flip, visible from 25 |

**Pack odds** (published in-app, not buried):

| Slot | Common | Uncommon | Rare | Legendary | Secret |
|---|---|---|---|---|---|
| 1–3 | 72% | 28% | — | — | — |
| 4 | — | — | 88% | 12% | — |
| 5 | — | — | 68% | 28% | 4% |

Slots 1–3 never reach rare, so slot 4 keeps its meaning; they roll uncommon so
early packs are not a five-card loop over the only five commons in the set.

Packs roll **rarity first, then a species that prints it** — the opposite order
from the ring, where the species is already on screen. Rolling species first
would strand most rolls on a species with no card in the band.

---

## 6. Architecture

```
content/set-01.ts       DATA ONLY. 30 card literals. No functions.
lib/cards.ts            Types, lookups, binder pages. Never holds a card.
lib/catalogue.ts        The one place content meets logic.
lib/balance.ts          Every tunable number. Roster lives here.
lib/flip.ts             Bands, snap-to-nearest, pack rolls, pity. Pure.
lib/game.ts             Save, encounter, grant, pack timer. Pure. No React.
lib/analytics.ts        One sink. Console today, an endpoint later.
scripts/                content:check, content:art
app/page.tsx            Composition: header, heading, nav, which screen.
app/_hooks/use-save.ts  Load, migrate, persist, cross-tab sync.
components/game/        Signal Lock, Scan, Binder, Packs, dialogs.
```

| File | Lines |
|---|---|
| `content/set-01.ts` | 553 |
| `lib/game.ts` | 517 |
| `lib/game.test.ts` | 445 |
| `components/game/scan-screen.tsx` | 280 |
| `lib/balance.ts` | 245 |
| `components/game/packs-screen.tsx` | 187 |
| `lib/flip.ts` | 152 |

All rolling and granting is pure and rng-injectable, so every distribution
claim above is asserted rather than eyeballed.

---

## 7. Save format

Key `starlets.phase2.v1`, **version 3**, localStorage only.

New this push: `packs { stored, accruedAt, pity, opened }` and a `shards` pool.
**Familiarity is deleted** — with no failed catch there is no permission left to
build toward, and running per-species pity beside pack pity would have been two
economies doing one job.

**v1 and v2 both migrate forward.** v1 turns `cardIds[]` into owned copies; v2
keeps its ownership map and starts the pack state empty. `parseSave` keeps its
strictness — an unknown cardId, a bad pack state or a negative shard balance all
throw rather than silently overwrite.

Art, rarity, name and number are still never stored. They resolve from the
catalogue at read time.

---

## 8. Analytics

Four events, behind a single `sink` function. Swapping console for an endpoint
is a one-file change and no caller moves.

| Event | Fires |
|---|---|
| `session_start` | Once per load, with discovered / owned / packs stored |
| `pack_open` | Per pack, with pity and lifetime opens |
| `card_granted` | Per card, with rarity, species, source, newSlot, duplicate, band |
| `page_progress` | Per **page turn** — not per save write |

Verified in the browser. `page_progress` fired on every state change before it
was moved out of an effect.

---

## 9. Bugs found by running it

1. **The reveal over-claimed new entries.** A pack holding two Dewlarks marked
   both as `NEW STARBOOK ENTRY`, because `newSlots` held species rather than
   cards. It now names the card that actually filled the slot.
2. **The page counter was invisible on mobile.** It reused `.status`, which a
   media query hides below 860px. "Two slots left on page 2" is the motivator,
   so it has its own class now.
3. **Binder pages opened out of order** — Garden, Caves, Coast, following the
   roster rather than the numbering. Pages now sort by card number, pinned by a
   test.

---

## 10. What is not built

- **Daily claim and streak** — the pack timer is the only reason to return
- **Stardust sinks** — Stardust accumulates with nowhere to go
- **Craft** — shards accumulate with nothing to spend them on
- **Card detail slab** — the finish treatment, the live foil, the flex surface
- **Display case, frames, share renderer, shop, SKUs**
- **Backend** — no accounts, no server clock, no cheat prevention

Cancelled, not deferred: Star Trials, combat stats, the Core matchup triangle,
abilities, Habitat, GPS, raids, trading. Potential is deleted. Cores survive as
cosmetic identity only.

---

## 11. Liabilities

1. **Art is the critical path.** 27 faces, 3 secrets, 6 sprites. Nothing
   downstream looks finished without it and no code unblocks it.
2. **Not deployed.** Worker uploaded; the account has no `workers.dev`
   subdomain, so there is no URL and nobody but the owner can play it.
   Deliberately deferred to the end.
3. **The ring flip has not been exercised in a browser this session.** Signal
   Lock guards on `document.hidden` and the preview pane reports hidden, so the
   tethers never fire under automation. The guard is correct behaviour. The
   path is covered by tests, but a human should click through it before merge.
4. **Skill has no range on rare species** — see §2. A design consequence, not a
   defect, but it means "quality weights the table" is only true for half the
   roster.
5. **Shards have no sink**, so duplicates currently mint a number that does
   nothing. Acceptable for one push; it stops being acceptable the moment
   duplicates get common.
6. **Local-only saves** mean the clock is the device clock. Fine until money
   exists.

---

## 12. Commit history

```
8c6f96f  Merged flip: binder, packs, 12h timer, and events
7a78363  Correct the catch model in the plan, and pin the catch guarantee
9a38acc  Rewrite APP-STATUS for the current build
eafb9cd  Rebalance Set 01 to three pages of nine, secrets unlisted
c5254cc  Split page.tsx into screens, and count the whole roster
1e53a07  Split the content layer so cards can be authored without touching lib/
b1945d3  Prune the template: 55 unused components, 8 deps, PNG art
04f2b12  Set 01 lock: 8 Starlets, 28 cards, one Lunara set
4cee66e  Phase 1: Starlets prototype (Signal Lock, Sparks, Starbook)
```

---

## 13. Next

The loop exists; nothing yet asks for tomorrow. The daily claim and streak are
the missing half of retention, and the Stardust and shard sinks are what stop
the currencies from reading as decoration.

After that: the card detail slab and the share renderer, which are the first
two things that need real art to mean anything — and which are the only reason
a deployed URL would be worth handing to someone.
