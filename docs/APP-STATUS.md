# Starlets — application status

**Date:** September 6, 2026

**Reviewed branch:** `flip-binder-packs` at `67e2641`

**Phase:** Phase 2 collection core implemented; Phase 2 incomplete

The playable loop is Scanner → Signal Lock → card reward → Binder, with timed five-card packs as a second card source. Every completed flip grants a card. The first card for a species fills its Starbook entry regardless of source.

## Implemented

- Eight-species Lunara roster
- Set 01 with 27 numbered cards in three fixed 3×3 pages and three unlisted secrets
- Three free scripted introductory flips
- Spark spending and regeneration
- Four-tether Signal Lock with low, mid, and high reward bands
- Five-card pack opening and a 12-hour timer capped at two stored packs
- Exact card ownership, copy counts, Stardust, and duplicate shards
- Binder page progress and secret tray
- Version-3 browser-local save state and legacy migration logic
- Four console event types behind a replaceable analytics sink

## Not implemented

- Final card art and six creature sprites
- Exact-card detail presentation and finish effects
- Crafting or any Stardust/shard spending
- Daily claim and streak
- Display case, frames, share renderer, shop, or payments
- Durable analytics and D1/D3/D7 reporting
- Accounts, backend, server clock, or cloud saves
- Verified live playtest deployment

## Known issues awaiting the behavior-fix pass

1. The advertised secret guarantee does not hold across all flip sequences.
2. Version-2 saves stored under the current key do not reach the migration function.
3. Clock rollback can move the pack accrual anchor backward.
4. Repeated identical cards in one pack can receive incorrect NEW/duplicate reporting.
5. Selecting a binder card opens species details rather than the exact printing.

## Content readiness

There are 38 intended unique production assets: 30 card faces and eight creature sprites. Mossbun and Novafox have provisional WebP sprites. Six species use the shared placeholder, and all 30 card faces are missing. File presence does not establish creative approval.

## Validation record

The previous implementation report recorded 20 passing game tests plus clean typecheck, lint, and content validation. Those checks were not rerun during the documentation cleanup. Owner-led browser playtesting remains pending.

The complete inventory, risk analysis, history, and Day 3 handoff live in `DAY-3-CURRENT-STATE.md`. The active remaining work and acceptance gates live in `PHASE-2-PLAN.md`.
