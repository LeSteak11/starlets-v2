# Starlets

Mobile-first collection prototype set on Lunara. Players trace a mystery signal, complete a four-tether Signal Lock, receive a card, fill three binder pages, and open timed five-card packs.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The development server normally opens at `http://localhost:3000`. Use `npm run build` for a production build and `npm run start` to run the built Worker.

## Current product

- Eight Starlets and 30 cards in **Lunara: First Light**
- 27 numbered cards across three 3×3 binder pages, plus three unlisted secrets
- Three free scripted introductory flips: Mossbun, Emberpanda, then Novafox
- Every completed flip grants a card; tether quality influences which printing appears
- Six starting Sparks, an eight-Spark regeneration cap, and one Spark every 90 minutes
- One free five-card pack every 12 hours, with up to two stored
- Duplicate copy counts, Stardust, shards, local saves, and encounter recovery
- Published pack odds and basic console analytics hooks

The collection loop is playable, but Phase 2 is unfinished. Card art, crafting, Stardust spending, daily rewards, durable analytics, sharing, and a deployed playtest URL remain outstanding. There are no accounts, gameplay backend, payments, battles, or cloud saves.

## Project documents

- `docs/DAY-3-CURRENT-STATE.md` — authoritative dated inventory, known issues, decisions, and PM handoff
- `docs/PHASE-2-PLAN.md` — active execution plan and completion criteria
- `docs/CONTENT-GUIDE.md` — card and art authoring rules
- `docs/APP-STATUS.md` — concise implementation snapshot
- `docs/DEV-BRIEF-CONTENT-LAYER.md` — completed historical refactor brief

When older plans disagree with the code or current-state document, use the current source for behavior and the dated current-state document for scope.

## Checks

```bash
npm run content:check
npm run content:art
npm run test
npm run typecheck
npm run lint
```

`npm test` runs `content:check` first. Missing art is reported without blocking content work; oversized assets and invalid content fail their respective checks. Browser feel and visual quality require owner-led playtesting and are not established by automated checks.

Local saves are browser- and origin-specific. Clearing browser storage removes progress. Use one active play tab while the game remains local-only.
