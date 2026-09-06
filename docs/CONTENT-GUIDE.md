# Content guide — authoring Set 01

You own `content/set-01.ts`, `public/cards/`, and `public/creatures/`.
Nothing in `lib/` needs to change to add, rename, re-rarity or re-art a card.

## Adding a card

1. Drop the art at `public/cards/lun01/029.webp`.
2. Append one object to `content/set-01.ts`.
3. Run `npm run content:check`.
4. Reload the app — it is in the binder.

`content/set-01.ts` holds data only: object literals, no functions, no
conditionals, no imports beyond the `StarletCard` type. If you find yourself
wanting logic in that file, it belongs in `lib/` — ask.

## The fields

| Field | Notes |
|---|---|
| `cardId` | `LUN-01-029`. Set and number only. **Never change or reuse one** — saves point at this string. Renumbering a card means a new `cardId`. |
| `setId` | `LUN-01`. |
| `number` | Binder order. Must run 1..`numberMax` with no gaps. **`null` for a secret** — secrets are unlisted, with no number and no binder slot. |
| `numberMax` | Count of *numbered* cards, so `012/27` renders without a lookup — bump it on every card when the set grows. |
| `speciesId` | Must exist in the roster in `lib/balance.ts`. |
| `name` | Large type on the face. Usually the species name. |
| `subtitle` | Small type under it. Omit on base cards. |
| `rarity` | `common` `uncommon` `rare` `legendary` `secret`. |
| `finish` | `matte` `foil` `fullart` `secret`. How it is printed. |
| `role` | `base` `pose` `foil` `fullart` `secret`. What it is in the set. |
| `art` | `/cards/lun01/029.webp`. |
| `core` / `zone` | Copied from the species. `content:check` fails if they disagree. |
| `illustrator` | Credit line on the card back. `TBD` until assigned. |
| `version` | Bump to swap art without touching `cardId`. |
| `isBase` | Exactly one `true` per species — the slot a catch fills. |

`role` and `finish` are separate on purpose. A pose card can be printed foil.
Do not collapse them.

## Rules `npm run content:check` enforces

Errors (these fail the build):

- `cardId`s are unique, `number` runs 1..`numberMax` with no gaps
- `numberMax` matches the count of numbered cards
- every zone is exactly one nine-card page, numbered contiguously
- only secrets are unlisted, and every secret is unlisted
- exactly one `isBase` per species
- every `speciesId` is in the roster; `core` and `zone` match that species
- `rarity`, `finish` and `role` are valid values
- no asset is over the 250 KB budget

Warnings (these never block you):

- art not found on disk — the placeholder renders and you keep working
- the set's rarity counts differ from the design target in
  `BALANCE.set01.byRarity`. That target is something to balance against while
  building the set, not a tripwire.

`npm run content:art` reports the same asset picture on its own: what is
missing, what is over budget, orphaned files in `public/cards/lun01/`, and what
the set weighs.

## Pages

Set 01 is **27 numbered cards in three fixed 3×3 pages**, one page per zone:

| Page | Zone | Numbers |
|---|---|---|
| 1 | Moon Garden | 001–009 |
| 2 | Crater Coast | 010–018 |
| 3 | Prism Caves | 019–027 |

Zones are scan flavour and page identity — not a separate collection type. A
card's zone comes from its species, so moving a card between pages means
changing which species it belongs to, or moving a whole species' zone.
`content:check` fails if any page is not exactly nine cards in one contiguous
run of numbers.

The three **secrets** sit outside all of this: `number: null`, no slot, no
counter on the face. They are an unlisted chase tray, not a fourth page with
one card on it. Their art is `s1.webp`, `s2.webp`, `s3.webp`.

## Art specs

| Asset | Size | Format | Budget |
|---|---|---|---|
| Card art | 1024 × 1434 (5:7 portrait) | WebP | ≤ 250 KB |
| Catch sprite | 1024 × 1024, transparent | WebP | ≤ 250 KB |

Card art is **full-bleed** — no frame, no border, no set number burned in. The
frame, the rarity treatment, the foil sweep and the number are all UI drawn on
top. A frame in the file means it renders twice.

Silhouettes for undiscovered Starlets are generated in code from the catch
sprite. Do not draw them.

Budget arithmetic: 30 cards plus 8 sprites at 250 KB is about 9.5 MB. At the
2 MB/PNG rate the prototype started with, the same set is 72 MB. The budget is
the difference between a page that loads on a phone and one that does not.

## Converting art to spec

```bash
npx sharp-cli --input art.png --output public/cards/lun01/029.webp resize 1024 1434 --fit cover -- webp --quality 82
```

Then `npm run content:art` to confirm it landed under budget.
