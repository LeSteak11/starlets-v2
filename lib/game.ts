import { BALANCE as B, INTRO_SPECIES, SPECIES } from './balance.ts';
import { CATALOGUE } from './catalogue.ts';
import { qualityBand, printingFor, rollPack } from './flip.ts';
import { emptyExpedition, type ExpeditionState } from './expeditions.ts';
export type RecordEntry = {
  /** Flips that landed on this species. Not a gate -- a tally. */
  caught: number;
  speciesDust: number;
  xp: number;
  firstCaught: number | null;
};
export type OwnedSource = 'catch' | 'pack' | 'craft' | 'intro';
/**
 * What the player holds, keyed by cardId. Art, rarity, name and number are
 * NEVER stored here -- they resolve from the catalogue at read time, so
 * re-arting a card or fixing a typo leaves existing saves working.
 */
export type OwnedCard = {
  cardId: string;
  /** Copies of this exact card. Dupes are the input to shards and crafting. */
  count: number;
  firstObtainedAt: number;
  source: OwnedSource;
  favorite: boolean;
};
export type Quality = 'Miss' | 'Near Miss' | 'Good' | 'Perfect';
export type Encounter = {
  speciesId: string;
  stage: 'signal' | 'lock' | 'result';
  intro: boolean;
  target: number;
  phase: number;
  rolls: number[];
  hits: Quality[];
  meter: number;
  /** The card this flip granted. Every flip grants one. */
  granted: string | null;
  /** True when this granted the first card of its species -- a new slot. */
  newSlot: boolean;
  /** True when the player already held this exact printing. */
  duplicate: boolean;
  reward: number;
  shardReward: number;
  sparkReward: number;
};
export type PackState = {
  /** Free packs waiting to be opened, capped at BALANCE.packs.stored. */
  stored: number;
  /** When the current 12h timer started counting. */
  accruedAt: number;
  /** Flips since the last secret. Guarantees one at BALANCE.packs.secretPity. */
  pity: number;
  /** Packs opened, for the pity display and for analytics. */
  opened: number;
};
export type Save = {
  version: 4;
  sparks: number;
  regeneratedAt: number;
  stardust: number;
  introStep: number;
  records: Record<string, RecordEntry>;
  owned: Record<string, OwnedCard>;
  packs: PackState;
  /** Minted by duplicates. Craft lands with the craft UI. */
  shards: number;
  encounter: Encounter | null;
  slowTiming: boolean;
  /** One equipped owned printing per discovered persistent Starlet. */
  equipped: Record<string, string>;
  /** Draft, active timer, and unclaimed reward share one persisted state. */
  expedition: ExpeditionState;
  expeditionsCompleted: number;
};
export const SAVE_KEY = 'starlets.phase2.v1';
/** Phase 1 saves live here. Read once, migrated forward, never written again. */
export const LEGACY_SAVE_KEY = 'starlets.phase1.v1';
export const blankRecord = (): RecordEntry => ({
  caught: 0,
  speciesDust: 0,
  xp: 0,
  firstCaught: null,
});
export const grantCard = (
  owned: Record<string, OwnedCard>,
  cardId: string,
  source: OwnedSource,
  now: number,
): Record<string, OwnedCard> => {
  const held = owned[cardId];
  return {
    ...owned,
    [cardId]: held
      ? { ...held, count: held.count + 1 }
      : { cardId, count: 1, firstObtainedAt: now, source, favorite: false },
  };
};
export function newSave(now = Date.now()): Save {
  return {
    version: 4,
    sparks: B.sparks.initial,
    regeneratedAt: now,
    stardust: 0,
    introStep: 0,
    records: Object.fromEntries(SPECIES.map((s) => [s.id, blankRecord()])),
    owned: {},
    packs: { stored: 0, accruedAt: now, pity: 0, opened: 0 },
    shards: 0,
    encounter: null,
    slowTiming: false,
    equipped: {},
    expedition: emptyExpedition(),
    expeditionsCompleted: 0,
  };
}
export function regenerate(save: Save, now = Date.now()): Save {
  if (now < save.regeneratedAt) return save;
  if (save.sparks >= B.sparks.cap) return { ...save, regeneratedAt: now };
  const ticks = Math.floor(
    (now - save.regeneratedAt) / B.sparks.regenerationMs,
  );
  if (!ticks) return save;
  const sparks = Math.min(B.sparks.cap, save.sparks + ticks);
  return {
    ...save,
    sparks,
    regeneratedAt:
      sparks === B.sparks.cap
        ? now
        : save.regeneratedAt + ticks * B.sparks.regenerationMs,
  };
}
/** Rarity has to be felt in the scan pool, not just printed on the card. */
export function weightedSpecies(roll: number) {
  const total = SPECIES.reduce((sum, s) => sum + s.encounterWeight, 0);
  let cursor = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const species of SPECIES) {
    cursor -= species.encounterWeight;
    if (cursor < 0) return species;
  }
  return SPECIES[0];
}
export function scan(save: Save, rng = Math.random, now = Date.now()): Save {
  if (save.encounter) return save;
  const state = regenerate(save, now);
  const intro = state.introStep < INTRO_SPECIES.length;
  const species = intro
    ? INTRO_SPECIES[state.introStep]
    : weightedSpecies(rng());
  return {
    ...state,
    encounter: {
      speciesId: species.id,
      stage: 'signal',
      intro,
      target: Math.floor(rng() * 360),
      phase: Math.floor(rng() * 360),
      rolls: Array.from(
        { length: B.capture.tethers },
        () =>
          Math.floor(rng() * (B.capture.variance * 2 + 1)) - B.capture.variance,
      ),
      hits: [],
      meter: 0,
      granted: null,
      newSlot: false,
      duplicate: false,
      reward: 0,
      shardReward: 0,
      sparkReward: 0,
    },
  };
}
export function beginEncounter(save: Save, now = Date.now()): Save {
  const state = regenerate(save, now),
    e = state.encounter;
  if (
    !e ||
    e.stage !== 'signal' ||
    (!e.intro && state.sparks < B.sparks.encounterCost)
  )
    return state;
  return {
    ...state,
    sparks: state.sparks - (e.intro ? 0 : B.sparks.encounterCost),
    encounter: { ...e, stage: 'lock' },
  };
}
export function qualityAt(
  angle: number,
  target: number,
  slow = false,
): Quality {
  const delta = Math.abs(((angle - target + 540) % 360) - 180);
  const perfectWindow = slow
    ? B.capture.slowPerfectWindow
    : B.capture.perfectWindow;
  const goodWindow = slow ? B.capture.slowGoodWindow : B.capture.goodWindow;
  return delta <= perfectWindow
    ? 'Perfect'
    : delta <= goodWindow
      ? 'Good'
      : delta <=
          (slow ? B.capture.slowNearMissWindow : B.capture.nearMissWindow)
        ? 'Near Miss'
        : 'Miss';
}
export const successfulTethers = (hits: readonly Quality[]) =>
  hits.filter((hit) => hit === 'Good' || hit === 'Perfect').length;
export const spentTetherAttempts = (hits: readonly Quality[]) =>
  hits.filter((hit) => hit === 'Miss').length;
export function tether(
  save: Save,
  angle: number,
  now = Date.now(),
  rng = Math.random,
  targetAngle = save.encounter?.target ?? 0,
): Save {
  const e = save.encounter;
  if (!e || e.stage !== 'lock' || !Number.isFinite(angle)) return save;
  const normalizedTarget = ((targetAngle % 360) + 360) % 360;
  const quality = qualityAt(
    ((angle % 360) + 360) % 360,
    normalizedTarget,
    save.slowTiming,
  );
  const spent = spentTetherAttempts(e.hits);
  const successful = quality === 'Good' || quality === 'Perfect';
  const counted = successful || quality === 'Miss';
  const gain = counted
    ? B.capture[quality.toLowerCase() as 'miss' | 'good' | 'perfect'] +
      e.rolls[Math.min(spent, e.rolls.length - 1)]
    : 0;
  const hits = [...e.hits, quality];
  const rawMeter = e.meter + gain;
  const done =
    successful || (quality === 'Miss' && spent + 1 >= B.capture.tethers);
  const next: Encounter = {
    ...e,
    hits,
    meter: Math.min(B.capture.threshold, rawMeter),
    target: normalizedTarget,
    stage: done ? 'result' : 'lock',
  };
  if (!done) return { ...save, encounter: next };
  // Every flip grants a card. Tether quality picks the band; the band snaps to
  // the nearest printing this Starlet actually has. The animal never changes.
  return grantFlip(save, next, hits, now, rng);
}
/** Resolves a finished flip into a card, shards, Stardust and a Starbook slot. */
function grantFlip(
  save: Save,
  encounter: Encounter,
  hits: Quality[],
  now: number,
  rng: () => number,
): Save {
  const species = SPECIES.find((s) => s.id === encounter.speciesId)!;
  const intro = encounter.intro;
  // The intro is scripted: the first three flips hand over the base cards.
  const card = intro
    ? CATALOGUE.baseFor(species.id)
    : printingFor(CATALOGUE, species.id, qualityBand(hits), rng);
  if (!card) return { ...save, encounter };
  return applyGrant(save, encounter, card.cardId, intro, now);
}
/**
 * Adds one granted card to the save. Shared by the ring and by packs so a
 * Starbook slot fills the same way whatever the card came from.
 */
export function applyGrant(
  save: Save,
  encounter: Encounter | null,
  cardId: string,
  intro: boolean,
  now: number,
): Save {
  const card = CATALOGUE.get(cardId);
  if (!card) return save;
  const old = save.records[card.speciesId];
  const duplicate = !!save.owned[cardId];
  // The slot fills the first time this species reaches the table, from any
  // source. Owning a card is the record -- there is no separate permission.
  const newSlot = !CATALOGUE.lineFor(card.speciesId).some(
    (c) => save.owned[c.cardId],
  );
  const dust = B.stardust[card.rarity];
  const shards = duplicate ? B.shards[card.rarity] : 0;
  const record = {
    ...old,
    caught: old.caught + 1,
    xp: old.xp + (newSlot ? B.xp.newCatch : B.xp.duplicate),
    firstCaught: old.firstCaught ?? now,
    speciesDust: old.speciesDust + dust,
  };
  const owned = grantCard(
    save.owned,
    cardId,
    intro ? 'intro' : encounter ? 'catch' : 'pack',
    now,
  );
  const pity = card.rarity === 'secret' ? 0 : save.packs.pity + 1;
  return {
    ...save,
    stardust: save.stardust + dust,
    shards: save.shards + shards,
    sparks: save.sparks + (intro ? B.sparks.introReward : 0),
    introStep: save.introStep + (intro ? 1 : 0),
    owned,
    equipped: newSlot
      ? { ...save.equipped, [card.speciesId]: cardId }
      : save.equipped,
    packs: { ...save.packs, pity },
    records: { ...save.records, [card.speciesId]: record },
    encounter: encounter
      ? {
          ...encounter,
          granted: cardId,
          newSlot,
          duplicate,
          reward: dust,
          shardReward: shards,
          sparkReward: intro ? B.sparks.introReward : 0,
        }
      : save.encounter,
  };
}
/**
 * Free packs accrue on the same 12-hour rhythm as the Spark refill, capped so
 * the game asks for a morning and an evening session rather than a marathon.
 * Like regenerate(), the clock only moves forward: winding the device back
 * loses nothing and gains nothing.
 */
export function accruePacks(save: Save, now = Date.now()): Save {
  if (now < save.packs.accruedAt)
    return { ...save, packs: { ...save.packs, accruedAt: now } };
  if (save.packs.stored >= B.packs.stored)
    return { ...save, packs: { ...save.packs, accruedAt: now } };
  const ticks = Math.floor((now - save.packs.accruedAt) / B.packs.timerMs);
  if (!ticks) return save;
  const stored = Math.min(B.packs.stored, save.packs.stored + ticks);
  return {
    ...save,
    packs: {
      ...save.packs,
      stored,
      accruedAt:
        stored === B.packs.stored
          ? now
          : save.packs.accruedAt + ticks * B.packs.timerMs,
    },
  };
}
export type PackOpening = {
  cardIds: string[];
  /**
   * The cardIds that actually filled a Starbook slot -- not the species, so a
   * pack holding two Dewlarks flags the first and not the second.
   */
  newSlots: string[];
};
/**
 * Opens one stored pack. Returns the save with every card granted and the
 * opening to reveal; the UI walks the cards one at a time.
 */
export function openPack(
  save: Save,
  rng = Math.random,
  now = Date.now(),
): { save: Save; opening: PackOpening | null } {
  const state = accruePacks(save, now);
  if (state.packs.stored < 1) return { save: state, opening: null };
  const roll = rollPack(CATALOGUE, state.packs.pity, rng);
  let next: Save = {
    ...state,
    packs: {
      ...state.packs,
      stored: state.packs.stored - 1,
      opened: state.packs.opened + 1,
      // Spending a stored pack restarts the timer only if none is waiting.
      accruedAt: state.packs.stored - 1 === 0 ? now : state.packs.accruedAt,
    },
  };
  const newSlots: string[] = [];
  for (const card of roll.cards) {
    const before = next;
    const filled = !CATALOGUE.lineFor(card.speciesId).some(
      (c) => before.owned[c.cardId],
    );
    next = applyGrant(next, null, card.cardId, false, now);
    if (filled) newSlots.push(card.cardId);
  }
  next = { ...next, packs: { ...next.packs, pity: roll.pity } };
  return {
    save: next,
    opening: { cardIds: roll.cards.map((c) => c.cardId), newSlots },
  };
}
export function dismissResult(save: Save): Save {
  return save.encounter?.stage === 'result'
    ? { ...save, encounter: null }
    : save;
}
const integer = (
  v: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
type LegacyRecord = {
  caught: number;
  familiarity?: number;
  speciesDust: number;
  xp: number;
  firstCaught: number | null;
  cardIds?: unknown;
};
/**
 * Older saves -> current. Playtest saves are migrated, never discarded;
 * anything the catalogue no longer knows about is still a damaged save.
 *
 * v1 -> v2: every cardIds[] entry becomes one owned copy from a catch.
 * v2 -> v3: Familiarity is dropped (the flip always grants, so there is no
 * permission left to build toward), and the pack timer, pity counter and
 * shard pool start empty.
 */
export function migrateLegacySave(raw: string, now = Date.now()): Save {
  const legacy = JSON.parse(raw) as Omit<
    Save,
    'version' | 'owned' | 'packs' | 'shards'
  > & {
    version: number;
    records: Record<string, LegacyRecord>;
    owned?: Record<string, OwnedCard>;
    packs?: PackState;
    shards?: number;
  };
  if (!legacy || !legacy.records || ![1, 2].includes(legacy.version))
    throw new Error('Unrecognized save');
  let owned: Record<string, OwnedCard> = {};
  const records: Record<string, RecordEntry> = {};
  for (const species of SPECIES) {
    const r = legacy.records[species.id];
    records[species.id] = r
      ? {
          caught: r.caught,
          speciesDust: r.speciesDust,
          xp: r.xp,
          firstCaught: r.firstCaught,
        }
      : blankRecord();
    const ids =
      legacy.version === 1 && Array.isArray(r?.cardIds)
        ? (r.cardIds as string[])
        : [];
    for (const legacyId of ids) {
      // Phase 1 ids were '<species>-default'; the base card is their heir.
      const base = CATALOGUE.baseFor(species.id);
      if (!base || !legacyId.startsWith(species.id))
        throw new Error('Damaged Starbook');
      owned = grantCard(owned, base.cardId, 'catch', r?.firstCaught ?? now);
    }
  }
  const migratedOwned = legacy.version === 2 ? (legacy.owned ?? {}) : owned;
  return parseSave(
    JSON.stringify({
      ...legacy,
      version: 4,
      records,
      // v2 already tracked ownership; v1 built it from cardIds above.
      owned: migratedOwned,
      packs: legacy.packs ?? { stored: 0, accruedAt: now, pity: 0, opened: 0 },
      shards: legacy.shards ?? 0,
      encounter: null,
      equipped: Object.fromEntries(
        SPECIES.flatMap((species) => {
          const first = CATALOGUE.lineFor(species.id).find(
            (card) => migratedOwned[card.cardId],
          );
          return first ? [[species.id, first.cardId]] : [];
        }),
      ),
      expedition: emptyExpedition(),
      expeditionsCompleted: 0,
    }),
  );
}
/** Reject damaged/incompatible saves rather than silently overwriting progress. */
export function parseSave(raw: string): Save {
  const parsed = JSON.parse(raw) as Omit<Partial<Save>, 'version'> & {
    version?: number;
  };
  // Phase 2 v3 saves are upgraded in place. Collection and economy fields are
  // copied unchanged; Expedition fields only add new state.
  let s = (
    parsed?.version === 3
      ? {
          ...parsed,
          version: 4,
          equipped: Object.fromEntries(
            SPECIES.flatMap((species) => {
              const first = CATALOGUE.lineFor(species.id).find(
                (card) => parsed.owned?.[card.cardId],
              );
              return first ? [[species.id, first.cardId]] : [];
            }),
          ),
          expedition: emptyExpedition(),
          expeditionsCompleted: 0,
        }
      : parsed
  ) as Save;
  // Resume encounters written by either earlier Signal Lock rule without
  // treating the whole save as damaged or charging another Spark. A green hit
  // in the superseded three-success draft becomes a free retry because the new
  // one-green rule would otherwise load an already-complete lock with no grant.
  if (
    s?.version === 4 &&
    s.encounter &&
    Array.isArray(s.encounter.rolls) &&
    [3, 4].includes(s.encounter.rolls.length)
  ) {
    const hits =
      s.encounter.stage === 'lock'
        ? s.encounter.hits.map((hit) =>
            hit === 'Good' || hit === 'Perfect' ? 'Near Miss' : hit,
          )
        : s.encounter.hits;
    s = {
      ...s,
      encounter: {
        ...s.encounter,
        rolls: s.encounter.rolls.slice(0, B.capture.tethers),
        hits,
        meter: Math.min(s.encounter.meter, B.capture.threshold),
      },
    };
  }
  if (
    !s ||
    s.version !== 4 ||
    !integer(s.sparks, 0) ||
    !integer(s.regeneratedAt, 0) ||
    !integer(s.stardust, 0) ||
    !integer(s.introStep, 0, INTRO_SPECIES.length) ||
    typeof s.slowTiming !== 'boolean' ||
    !s.records
  )
    throw new Error('Unrecognized save');
  for (const species of SPECIES) {
    const r = s.records[species.id];
    if (
      !r ||
      !integer(r.caught, 0) ||
      !integer(r.speciesDust, 0) ||
      !integer(r.xp, 0) ||
      !(r.firstCaught === null || integer(r.firstCaught, 0))
    )
      throw new Error('Damaged Starbook');
  }
  const p = s.packs;
  if (
    !p ||
    !integer(p.stored, 0, B.packs.stored) ||
    !integer(p.accruedAt, 0) ||
    !integer(p.pity, 0) ||
    !integer(p.opened, 0) ||
    !integer(s.shards, 0)
  )
    throw new Error('Damaged pack state');
  if (!s.owned || typeof s.owned !== 'object' || Array.isArray(s.owned))
    throw new Error('Damaged collection');
  for (const [cardId, o] of Object.entries(s.owned)) {
    // An unknown cardId is a damaged save, not a card to quietly drop.
    if (
      !CATALOGUE.byId.has(cardId) ||
      !o ||
      o.cardId !== cardId ||
      !integer(o.count, 1) ||
      !integer(o.firstObtainedAt, 0) ||
      !['catch', 'pack', 'craft', 'intro'].includes(o.source) ||
      typeof o.favorite !== 'boolean'
    )
      throw new Error('Damaged collection');
  }
  if (
    !s.equipped ||
    typeof s.equipped !== 'object' ||
    Array.isArray(s.equipped) ||
    !integer(s.expeditionsCompleted, 0)
  )
    throw new Error('Damaged Expedition state');
  for (const [speciesId, cardId] of Object.entries(s.equipped)) {
    const card = CATALOGUE.get(cardId);
    if (!card || card.speciesId !== speciesId || !s.owned[cardId])
      throw new Error('Damaged equipped card');
  }
  const x = s.expedition;
  if (
    !x ||
    !integer(x.assignmentIndex, 0) ||
    !Array.isArray(x.team) ||
    x.team.length > 3 ||
    !(x.startedAt === null || integer(x.startedAt, 0)) ||
    !(x.completesAt === null || integer(x.completesAt, 0)) ||
    !(x.reward === null || integer(x.reward, 0)) ||
    !(
      x.tier === null ||
      ['Ready', 'Strong Match', 'Perfect Match'].includes(x.tier)
    )
  )
    throw new Error('Damaged Expedition state');
  const expeditionSpecies = new Set<string>();
  for (const member of x.team) {
    const card = CATALOGUE.get(member?.cardId);
    if (
      !member ||
      typeof member.speciesId !== 'string' ||
      expeditionSpecies.has(member.speciesId) ||
      !card ||
      card.speciesId !== member.speciesId ||
      !s.owned[member.cardId] ||
      s.records[member.speciesId]?.caught < 1
    )
      throw new Error('Damaged Expedition team');
    expeditionSpecies.add(member.speciesId);
  }
  if (
    (x.startedAt === null) !== (x.completesAt === null) ||
    (x.startedAt === null) !== (x.tier === null) ||
    (x.startedAt === null) !== (x.reward === null) ||
    (x.startedAt !== null && x.team.length === 0)
  )
    throw new Error('Damaged Expedition timing');
  const e = s.encounter;
  if (e !== null) {
    if (
      !e ||
      !SPECIES.some((sp) => sp.id === e.speciesId) ||
      !['signal', 'lock', 'result'].includes(e.stage) ||
      !integer(e.target, 0, 359) ||
      !integer(e.phase, 0, 359) ||
      !Array.isArray(e.rolls) ||
      e.rolls.length !== B.capture.tethers ||
      e.rolls.some(
        (n) => !integer(n, -B.capture.variance, B.capture.variance),
      ) ||
      !Array.isArray(e.hits) ||
      e.hits.length > B.capture.maxRecordedInputs ||
      e.hits.some(
        (h) => !['Miss', 'Near Miss', 'Good', 'Perfect'].includes(h),
      ) ||
      !integer(e.meter, 0, B.capture.threshold) ||
      !integer(e.reward, 0) ||
      !integer(e.sparkReward, 0) ||
      [e.intro, e.newSlot, e.duplicate].some((v) => typeof v !== 'boolean') ||
      !(e.granted === null || CATALOGUE.byId.has(e.granted)) ||
      !integer(e.shardReward, 0) ||
      (e.stage === 'lock' &&
        (successfulTethers(e.hits) > 0 ||
          spentTetherAttempts(e.hits) >= B.capture.tethers)) ||
      (e.stage === 'result' && e.granted === null && !e.intro)
    )
      throw new Error('Damaged encounter');
  }
  return s;
}
