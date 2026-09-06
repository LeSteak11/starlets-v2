# Starlets — Phase 1

Mobile-first local-save prototype: Scanner → mystery signal → timed Signal Lock → catch/Familiarity → Starbook.

## Run

`npm install` then `npm run dev` (http://localhost:3000). `npm run build` builds the production Worker. `npm run test` verifies game rules; `npm run typecheck` checks TypeScript.

## Current scope

Three initial creatures (Mossbun, Novafox, Emberpanda), four-tether encounters, visible catch quality, deterministic Familiarity guarantee, first-catch/default Card ownership, duplicate catch records, Spark regeneration, and browser-local saves. In-flight signals, tethers, and results survive reloads. No accounts or gameplay backend. The web host serves the application only.

Three introductory contacts are free and guaranteed; each grants one Spark and normal catch Stardust. Start with 6 Sparks; regenerate toward a cap of 8 every 90 minutes. Reward overflow is retained. Full Welcome Constellation narrative and Guide assist remain Phase 2. Slower timing is available before encounters. Honor reduced-motion preferences for decorative effects; the functional timing tracer stays animated.

All gameplay tuning is in `lib/balance.ts`. Rarity is species-owned, and Cards inherit it rather than defining independent rarity or stat bonuses. Launch defaults: 9 Common / 5 Rare / 3 Epic / 1 Legendary; alternates: 3 / 2 / 1 / 0. These are future full-roster targets, not 24 implemented Cards. Base Potential and Star Rise multipliers are defined and tested for future progression; no training or battle system is exposed in Phase 1. Global and species Stardust currently record the same catch award for their eventual separate sinks.

## Playtest

1. Complete the three free contacts. Verify the Spark reward, catch reveal, and Starbook entry.
2. Scan again and begin a normal encounter. Aim for the bright green center; the target shifts after each tether.
3. Intentionally miss four tethers. Verify +25 species Familiarity, without a catch or Stardust reward.
4. Reload during a paid encounter or result; progress and spent Spark should persist.
5. Review Starbook details and reset through Settings to repeat a first-session playtest.
6. Primary validation: after the first catch, does the player voluntarily scan again? Note timing frustration, reward clarity, and desire for another discovery.

Automated validation covers economy, captures, duplicates, save parsing, pity guarantees, and rarity rules. Browser interaction/visual QA and the optional WebMCP read-only bridge require a suitable browser validation context; do not infer they passed from unit tests.

Local storage is browser/origin-specific. Moving between local and hosted URLs uses different saves. Clearing browser data removes progress. Damaged saves are preserved until explicit reset. Multi-tab updates are synchronized through storage events, but localStorage is not a transactional database; use one active play tab.

Deferred: full 18-species roster, progression UI, Starbond, Starguides, Trials, Habitat, Market, payments, GPS, cloud saves.

User handoff: further testing is user-led. Mossbun and Novafox have provisional generated artwork; Emberpanda uses the Starlets symbol as a Phase 1 placeholder. This local preview has not completed production-build or browser validation.
