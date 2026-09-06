import { BALANCE as B, SPECIES } from './balance.ts';
export type RecordEntry = {
  caught: number;
  familiarity: number;
  speciesDust: number;
  xp: number;
  firstCaught: number | null;
  cardIds: string[];
};
export type Quality = 'Miss' | 'Good' | 'Perfect';
export type Encounter = {
  speciesId: string;
  stage: 'signal' | 'lock' | 'result';
  intro: boolean;
  guaranteed: boolean;
  target: number;
  phase: number;
  rolls: number[];
  hits: Quality[];
  meter: number;
  caught: boolean;
  reward: number;
  sparkReward: number;
  wasNew: boolean;
};
export type Save = {
  version: 1;
  sparks: number;
  regeneratedAt: number;
  stardust: number;
  introStep: number;
  records: Record<string, RecordEntry>;
  encounter: Encounter | null;
  slowTiming: boolean;
};
export const SAVE_KEY = 'starlets.phase1.v1';
export const blankRecord = (): RecordEntry => ({
  caught: 0,
  familiarity: 0,
  speciesDust: 0,
  xp: 0,
  firstCaught: null,
  cardIds: [],
});
export function newSave(now = Date.now()): Save {
  return {
    version: 1,
    sparks: B.sparks.initial,
    regeneratedAt: now,
    stardust: 0,
    introStep: 0,
    records: Object.fromEntries(SPECIES.map((s) => [s.id, blankRecord()])),
    encounter: null,
    slowTiming: false,
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
export function scan(save: Save, rng = Math.random, now = Date.now()): Save {
  if (save.encounter) return save;
  const state = regenerate(save, now);
  const intro = state.introStep < SPECIES.length;
  const species =
    SPECIES[
      intro
        ? state.introStep
        : Math.min(SPECIES.length - 1, Math.floor(rng() * SPECIES.length))
    ];
  return {
    ...state,
    encounter: {
      speciesId: species.id,
      stage: 'signal',
      intro,
      guaranteed:
        intro ||
        state.records[species.id].familiarity >= B.familiarity.guarantee,
      target: Math.floor(rng() * 360),
      phase: Math.floor(rng() * 360),
      rolls: Array.from(
        { length: B.capture.tethers },
        () =>
          Math.floor(rng() * (B.capture.variance * 2 + 1)) - B.capture.variance,
      ),
      hits: [],
      meter: 0,
      caught: false,
      reward: 0,
      sparkReward: 0,
      wasNew: state.records[species.id].caught === 0,
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
export function qualityAt(angle: number, target: number): Quality {
  const delta = Math.abs(((angle - target + 540) % 360) - 180);
  return delta <= B.capture.perfectWindow
    ? 'Perfect'
    : delta <= B.capture.goodWindow
      ? 'Good'
      : 'Miss';
}
export function tether(save: Save, angle: number, now = Date.now()): Save {
  const e = save.encounter;
  if (!e || e.stage !== 'lock' || !Number.isFinite(angle)) return save;
  const quality = qualityAt(((angle % 360) + 360) % 360, e.target);
  const gain =
    B.capture[quality.toLowerCase() as 'miss' | 'good' | 'perfect'] +
    e.rolls[e.hits.length];
  const hits = [...e.hits, quality];
  const rawMeter = e.meter + gain;
  const done =
    rawMeter >= B.capture.threshold || hits.length >= B.capture.tethers;
  const caught = done && (rawMeter >= B.capture.threshold || e.guaranteed);
  let next: Encounter = {
    ...e,
    hits,
    meter: caught ? B.capture.threshold : rawMeter,
    target: (e.target + 83) % 360,
    stage: done ? 'result' : 'lock',
    caught,
  };
  if (!done) return { ...save, encounter: next };
  const species = SPECIES.find((s) => s.id === e.speciesId)!;
  const old = save.records[species.id];
  const record = { ...old, cardIds: [...old.cardIds] };
  let stardust = save.stardust,
    sparks = save.sparks,
    introStep = save.introStep;
  if (caught) {
    record.caught += 1;
    record.familiarity = 0;
    record.xp += old.caught ? B.xp.duplicate : B.xp.newCatch;
    record.firstCaught ??= now;
    record.speciesDust += B.stardust[species.rarity];
    if (!record.cardIds.includes(`${species.id}-default`))
      record.cardIds.push(`${species.id}-default`);
    stardust += B.stardust[species.rarity];
    if (e.intro) {
      sparks += B.sparks.introReward;
      introStep += 1;
    }
    next = {
      ...next,
      reward: B.stardust[species.rarity],
      sparkReward: e.intro ? B.sparks.introReward : 0,
    };
  } else {
    record.familiarity = Math.min(
      B.familiarity.guarantee,
      record.familiarity + B.familiarity.failure,
    );
  }
  return {
    ...save,
    stardust,
    sparks,
    introStep,
    records: { ...save.records, [species.id]: record },
    encounter: next,
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
/** Reject damaged/incompatible saves rather than silently overwriting progress. */
export function parseSave(raw: string): Save {
  const s = JSON.parse(raw) as Save;
  if (
    !s ||
    s.version !== 1 ||
    !integer(s.sparks, 0) ||
    !integer(s.regeneratedAt, 0) ||
    !integer(s.stardust, 0) ||
    !integer(s.introStep, 0, 3) ||
    typeof s.slowTiming !== 'boolean' ||
    !s.records
  )
    throw new Error('Unrecognized save');
  for (const species of SPECIES) {
    const r = s.records[species.id];
    if (
      !r ||
      !integer(r.caught, 0) ||
      !integer(r.familiarity, 0, 100) ||
      !integer(r.speciesDust, 0) ||
      !integer(r.xp, 0) ||
      !(r.firstCaught === null || integer(r.firstCaught, 0)) ||
      !Array.isArray(r.cardIds) ||
      r.cardIds.some((id) => id !== `${species.id}-default`)
    )
      throw new Error('Damaged Starbook');
  }
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
      e.hits.length > B.capture.tethers ||
      e.hits.some((h) => !['Miss', 'Good', 'Perfect'].includes(h)) ||
      !integer(e.meter, 0, B.capture.threshold) ||
      !integer(e.reward, 0) ||
      !integer(e.sparkReward, 0) ||
      [e.intro, e.guaranteed, e.caught, e.wasNew].some(
        (v) => typeof v !== 'boolean',
      ) ||
      (e.stage === 'lock' && e.hits.length >= B.capture.tethers)
    )
      throw new Error('Damaged encounter');
  }
  return s;
}
