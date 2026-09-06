# Dev brief — split the content layer so I can author cards without you

**From:** Dada
**Re:** `lib/cards.ts`, `lib/balance.ts`, save ownership shape
**Ask:** restructure only. **Do not author card content or art in this ticket** — set it up so I can, and write down how.

---

## Why

Set 01 is good work and the species/card split is the right call. But as built, every card content change routes through you:

1. **Art is derived, not authored.** `card()` sets `art: kind === 'base' ? species.art : PLACEHOLDER`. There is no way for me to point card 12 at a specific file without editing the factory.
2. **The factory is positional.** `card(1, 'mossbun', 'Mossbun', 'base', 'Common')` — I can't add a subtitle or an illustrator without changing a function signature.
3. **The drift assertion throws at import.** If I change one rarity, the whole app fails to boot with `Set 01 no longer matches the locked shape` — no field name, no card number. Correct instinct, unusable failure mode for a non-engineer editing content.
4. **`cardId` encodes species and kind.** `lun-001-mossbun-base` breaks the moment a card is renumbered, re-kinded, or reassigned — and it breaks saves with it.
5. **Ownership has no counts.** `record.cardIds: string[]` can't express duplicates, so packs, shards and crafting have nothing to write to.

I want to add cards, titles, rarities, subtitles and art on my own, all week, without opening a PR against your logic.

---

## The split

One file I own. One file you own. They never overlap.

```
content/set-01.ts     ← MINE. Data only. Plain object literals. No logic, no imports beyond types.
lib/cards.ts          ← YOURS. Types, helpers, lookups, validation. No card content.
public/cards/lun01/   ← MINE. Card art, one file per card number.
public/creatures/     ← MINE. Catch sprites, one per species.
```

Rule: `lib/cards.ts` must never contain a card. `content/set-01.ts` must never contain a function.

---

## 1. Card record — every field explicit

```ts
export type Rarity   = 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret';
export type Finish   = 'matte' | 'foil' | 'fullart' | 'secret';
export type CardRole = 'base' | 'pose' | 'foil' | 'fullart' | 'secret';
export type Core     = 'grove' | 'tide' | 'flare';

export type StarletCard = {
  cardId: string;       // 'LUN-01-012' — stable forever, never reused
  setId: string;        // 'LUN-01'
  number: number;       // 12 — binder order
  numberMax: number;    // 28 — so 012/28 renders without a lookup
  speciesId: string;    // 'mossbun'
  name: string;         // 'Mossbun'
  subtitle?: string;    // 'Dewdrop' — omitted on base cards
  rarity: Rarity;
  finish: Finish;
  role: CardRole;
  art: string;          // '/cards/lun01/012.webp'
  core: Core;           // copied from species at authoring time
  zone: string;         // copied from species at authoring time
  illustrator: string;
  version: number;      // bump to swap art without changing cardId
  isBase: boolean;      // exactly one true per species
};
```

**Changes from what's in the repo now:**

| Now | Change to | Why |
|---|---|---|
| `id: 'lun-001-mossbun-base'` | `cardId: 'LUN-01-012'` | An ID that encodes species or kind breaks when either changes, and takes saves with it. Set + number only. |
| `title: string` | `name` + optional `subtitle` | Renders as two type sizes on the face. One string can't. |
| `foil: boolean`, `fullArt: boolean` | `finish` enum | Two booleans can express `foil && fullArt`, which is not a thing. One enum, one truth. |
| `kind` | `role` | Same field, my vocabulary. Rename so the docs and the code match. |
| *(derived)* | `art` authored | The whole point of this ticket. |
| *(absent)* | `numberMax`, `core`, `zone`, `illustrator`, `version`, `isBase` | Self-contained cards. A card should render without three lookups. |

**`role` and `finish` are independent axes, deliberately.** `role` is what the card is in the set structure; `finish` is how it's printed. A `pose` card can be `foil`. Don't collapse them back into one field.

---

## 2. What stays on species, and never gets copied to cards

`speciesId`, display name, `number` (`#001` Pokédex slot), `rarityBase` (first-catch rarity), `core`, `zone`, `speed`, `encounterWeight`, `intro`, `lore`, `signatureName`, `catchSprite`, `silhouette`.

**Split `art` into two fields on species.** Right now `species.art` is doing double duty as the Signal Lock sprite and the base card image. They are different files at different aspect ratios: `catchSprite` is the creature in the orbit ring, `card.art` is a printed card face. A 2 MB square PNG must never end up in the binder.

Economy stays on species/rarity — `stardustOnCatch` is not a per-card field.

---

## 3. Ownership — the save shape

Replace `RecordEntry.cardIds: string[]` with a flat owned map:

```ts
type OwnedCard = {
  cardId: string;
  count: number;                                    // dupes of this exact card
  firstObtainedAt: number;
  source: 'catch' | 'pack' | 'craft' | 'intro';
  favorite: boolean;
};

type Save = {
  // ...
  owned: Record<string, OwnedCard>;
};
```

**Never store art, rarity, name or number in the save.** Those resolve from the catalog at read time, so when I bump a card's art or fix a typo, existing saves still work.

Needs a real forward migration: every `cardIds[]` entry becomes `{count: 1, source: 'catch', favorite: false, firstObtainedAt: record.firstCaught}`. Don't discard playtest saves. `parseSave` keeps its current strictness — an unknown `cardId` in a save should still throw. That function is the best code in the repo and this ticket doesn't lower its standard.

---

## 4. Turn the import-time throw into a script

Delete the bare block at the bottom of `cards.ts` that throws on drift. Replace with `npm run content:check`, wired into `pretest`, that prints **every** problem with the card number and field name:

```
✗ LUN-01-012  rarity 'epic' is not a valid Rarity
✗ LUN-01-017  art '/cards/lun01/017.webp' not found on disk
✗ LUN-01-024  core 'flare' does not match species 'glimmerelk' (grove)
✗ mossbun     has 2 base cards (LUN-01-001, LUN-01-003) — exactly 1 required
✗ set         28 cards declared, 27 found; number 019 missing
3 errors
```

Rules it enforces: unique `cardId`s; `number` contiguous 1..`numberMax`; `numberMax` matches actual count; exactly one `isBase` per species; every `speciesId` exists in the roster; `core`/`zone` match their species; every `art` path resolves to a real file; rarity/finish/role are valid values; no card for a species outside the roster.

**Missing art must warn, not crash.** Fall back to the placeholder and let me keep working while the art is in progress. A missing image is a Tuesday, not an outage.

The rarity-count lock in `BALANCE.set01.byRarity` becomes a **warning**, not an error. It's a design target I need to move while balancing the set, not a tripwire that bricks my dev server.

---

## 5. Art convention — what I need from you

Card art path is `/cards/lun01/{number padded to 3}.webp`. I drop the file, I set the `art` field, done.

Give me these numbers in `docs/CONTENT-GUIDE.md` and I'll hit them:

- **Card art:** 5:7 portrait, target 1024×1434, WebP, **≤250 KB**, full-bleed (no frame — the frame is UI).
- **Catch sprite:** 1024×1024, transparent, WebP, ≤250 KB.
- **Silhouette:** generated from the sprite in code, not authored by me. Don't make me draw 8 of these.

Add a `npm run content:art` that reports every file over budget and every card pointing at a missing file. At 28 cards the current ~2 MB/PNG rate is 56 MB, which is not shippable.

---

## 6. What "done" looks like

I should be able to add a card by:

1. Dropping `public/cards/lun01/029.webp`
2. Appending one object literal to `content/set-01.ts`
3. Running `npm run content:check`
4. Seeing it in the binder

No changes to `lib/`, no function signatures, no help from you.

---

## Scope — explicitly not in this ticket

Don't author card content, don't make art, don't build the binder UI, don't touch Signal Lock, don't start packs or shards. This is the content layer and the ownership shape only. Everything else in `PHASE-2-PLAN.md` still stands and comes after.

## Also flagging, not blocking

- **`app/page.tsx` still doesn't import `cards.ts` at all** — Set 01 is data with no UI behind it yet, and the file is still 882 lines. It needs splitting before the binder lands, per the plan's do-first list.
- **Binder pages are currently zones**, giving 11 / 10 / 7 cards. Thematic and defensible, but it loses the 3×3 page and the "two slots left" read. Worth a conversation before the binder UI starts — not part of this ticket.
- **6 of 8 species are on `placeholder.svg`**, Emberpanda included. That's mine to fix, and it's the critical path for the whole phase.
