/** All gameplay tuning lives here. Phase 2/3 values are data, not active systems. */
export const BALANCE = {
  sparks: {
    initial: 6,
    cap: 8,
    regenerationMs: 90 * 60 * 1000,
    encounterCost: 1,
    introReward: 1,
  },
  familiarity: { failure: 25, guarantee: 100 },
  capture: {
    tethers: 4,
    threshold: 80,
    perfectWindow: 13,
    goodWindow: 38,
    perfect: 32,
    good: 23,
    miss: 5,
    variance: 3,
    cooldownMs: 650,
    orbitMs: 2600,
    slowOrbitMs: 4500,
  },
  stardust: { Common: 20, Rare: 40, Epic: 80, Legendary: 160 },
  xp: { newCatch: 50, duplicate: 20, levelCap: 30 },
  launch: {
    defaultCards: { Common: 9, Rare: 5, Epic: 3, Legendary: 1 },
    alternateCards: { Common: 3, Rare: 2, Epic: 1, Legendary: 0 },
  },
  potential: { Common: 44, Rare: 50, Epic: 56, Legendary: 62 },
  riseMultiplier: { Origin: 1, Rise: 1.12, Zenith: 1.25 },
  trainingPerLevel: 0.8,
} as const;
export type Rarity = keyof typeof BALANCE.potential;
export type Core = 'Grove' | 'Tide' | 'Flare';
export const SPECIES = [
  {
    id: 'mossbun',
    name: 'Mossbun',
    number: '001',
    rarity: 'Common' as Rarity,
    core: 'Grove' as Core,
    zone: 'Moon Garden',
    color: '#b9f77e',
    signalStyle: 'Steady drift',
    speed: 1,
    lore: 'It listens through the moss on its ears. When the garden falls silent, it hears the stars.',
    signature: 'Verdant Echo',
    art: '/creatures/mossbun.png',
  },
  {
    id: 'novafox',
    name: 'Novafox',
    number: '002',
    rarity: 'Rare' as Rarity,
    core: 'Tide' as Core,
    zone: 'Crater Coast',
    color: '#8cdaff',
    signalStyle: 'Tidal surge',
    speed: 1.18,
    lore: 'Its flowing tail traces tides that no ocean remembers. It appears where moonlight touches still water.',
    signature: 'Comet Dash',
    art: '/creatures/novafox.png',
  },
  {
    id: 'emberpanda',
    name: 'Emberpanda',
    number: '003',
    rarity: 'Common' as Rarity,
    core: 'Flare' as Core,
    zone: 'Prism Caves',
    color: '#ffb67e',
    signalStyle: 'Solar pulse',
    speed: 1.08,
    lore: 'A quiet keeper of borrowed sunlight. The embers in its coat stay warm through Lunara’s longest nights.',
    signature: 'Sunburst',
    art: '/favicon.svg',
  },
] as const;
export const DEFAULT_CARDS = SPECIES.map((s) => ({
  id: `${s.id}-default`,
  speciesId: s.id,
  core: s.core,
  art: s.art,
  signature: s.signature,
}));
/** Cards never enter this calculation. Training can outweigh the rarity gap. */
export function developedPotential(
  rarity: Rarity,
  level: number,
  form: keyof typeof BALANCE.riseMultiplier,
) {
  return Math.min(
    100,
    Math.round(
      (BALANCE.potential[rarity] +
        (Math.max(1, Math.min(level, BALANCE.xp.levelCap)) - 1) *
          BALANCE.trainingPerLevel) *
        BALANCE.riseMultiplier[form],
    ),
  );
}

