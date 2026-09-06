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
  /** Catch payout is a species/rarity value. It is never a per-card field. */
  stardust: {
    common: 20,
    uncommon: 30,
    rare: 40,
    legendary: 160,
    secret: 240,
  },
  xp: { newCatch: 50, duplicate: 20, levelCap: 30 },
  /**
   * Set 01 design targets. `npm run content:check` reports drift from
   * byRarity as a warning, not an error -- it is a target to balance
   * against, not a tripwire that bricks the dev server.
   */
  set01: {
    setId: 'LUN-01',
    cards: 28,
    species: 8,
    byRarity: { common: 5, uncommon: 6, rare: 9, legendary: 5, secret: 3 },
  },
  /** Asset budgets. `npm run content:art` reports anything over. */
  art: {
    maxBytes: 250 * 1024,
    card: { width: 1024, height: 1434 },
    sprite: { width: 1024, height: 1024 },
  },
} as const;
/** Card rarity. Species carry the same scale, minus secret: no species is secret-only. */
export type Rarity = keyof typeof BALANCE.stardust;
export type SpeciesRarity = Exclude<Rarity, 'secret'>;
export type Core = 'grove' | 'tide' | 'flare';
export type Zone = 'Moon Garden' | 'Crater Coast' | 'Prism Caves';
export const RARITIES = Object.keys(BALANCE.stardust) as Rarity[];
export const CORES: Core[] = ['grove', 'tide', 'flare'];
/** Enums are lowercase in data and Title Case on screen. One place converts. */
export const label = (value: string) => value[0].toUpperCase() + value.slice(1);
/**
 * Set 01 roster: 8 Starlets, frozen. Species count does not rise until the
 * binder and the pack timer exist. Names and art here are placeholders pending
 * final design; the rarity spine is the lock.
 *
 * `intro` marks the three tutorial catches, in order. The mascot is deliberately
 * not one of them -- players should see its silhouette for weeks.
 * `encounterWeight` biases the scan pool so rarity is felt, not just labelled.
 */
export const SPECIES = [
  {
    id: 'mossbun',
    name: 'Mossbun',
    number: '001',
    rarityBase: 'common' as SpeciesRarity,
    core: 'grove' as Core,
    zone: 'Moon Garden' as Zone,
    color: '#b9f77e',
    signalStyle: 'Steady drift',
    speed: 1,
    intro: true,
    encounterWeight: 26,
    lore: 'It listens through the moss on its ears. When the garden falls silent, it hears the stars.',
    signatureName: 'Verdant Echo',
    catchSprite: '/creatures/mossbun.webp',
  },
  {
    id: 'emberpanda',
    name: 'Emberpanda',
    number: '002',
    rarityBase: 'common' as SpeciesRarity,
    core: 'flare' as Core,
    zone: 'Prism Caves' as Zone,
    color: '#ffb67e',
    signalStyle: 'Solar pulse',
    speed: 1.08,
    intro: true,
    encounterWeight: 24,
    lore: 'A quiet keeper of borrowed sunlight. The embers in its coat stay warm through Lunara’s longest nights.',
    signatureName: 'Sunburst',
    catchSprite: '/creatures/placeholder.svg',
  },
  {
    id: 'novafox',
    name: 'Novafox',
    number: '003',
    rarityBase: 'rare' as SpeciesRarity,
    core: 'tide' as Core,
    zone: 'Crater Coast' as Zone,
    color: '#8cdaff',
    signalStyle: 'Tidal surge',
    speed: 1.18,
    intro: true,
    encounterWeight: 9,
    lore: 'Its flowing tail traces tides that no ocean remembers. It appears where moonlight touches still water.',
    signatureName: 'Comet Dash',
    catchSprite: '/creatures/novafox.webp',
  },
  {
    id: 'dewlark',
    name: 'Dewlark',
    number: '004',
    rarityBase: 'common' as SpeciesRarity,
    core: 'grove' as Core,
    zone: 'Moon Garden' as Zone,
    color: '#a7e8bd',
    signalStyle: 'Scattered flutter',
    speed: 1.04,
    intro: false,
    encounterWeight: 26,
    lore: 'It drinks the dew that collects on fallen starlight, and sings only where nobody is listening.',
    signatureName: 'Morning Chorus',
    catchSprite: '/creatures/placeholder.svg',
  },
  {
    id: 'shellune',
    name: 'Shellune',
    number: '005',
    rarityBase: 'uncommon' as SpeciesRarity,
    core: 'tide' as Core,
    zone: 'Crater Coast' as Zone,
    color: '#9fc7ff',
    signalStyle: 'Slow swell',
    speed: 0.94,
    intro: false,
    encounterWeight: 8,
    lore: 'Its shell keeps the shape of every tide it has outlived. Hold it to your ear and the crater answers.',
    signatureName: 'Pearl Current',
    catchSprite: '/creatures/placeholder.svg',
  },
  {
    id: 'cindermoth',
    name: 'Cindermoth',
    number: '006',
    rarityBase: 'uncommon' as SpeciesRarity,
    core: 'flare' as Core,
    zone: 'Prism Caves' as Zone,
    color: '#ffa8a0',
    signalStyle: 'Guttering flicker',
    speed: 1.22,
    intro: false,
    encounterWeight: 6,
    lore: 'Drawn to any light it did not make. Its wings leave warm ash on the cave walls it passes.',
    signatureName: 'Ash Bloom',
    catchSprite: '/creatures/placeholder.svg',
  },
  {
    id: 'glimmerelk',
    name: 'Glimmerelk',
    number: '007',
    rarityBase: 'rare' as SpeciesRarity,
    core: 'grove' as Core,
    zone: 'Moon Garden' as Zone,
    color: '#d9c6ff',
    signalStyle: 'Long resonance',
    speed: 1.1,
    intro: false,
    encounterWeight: 1,
    lore: 'Its antlers hold light the way a riverbed holds water. Whole seasons pass between sightings.',
    signatureName: 'Antler Dawn',
    catchSprite: '/creatures/placeholder.svg',
  },
  {
    id: 'selenith',
    name: 'Selenith',
    number: '008',
    rarityBase: 'legendary' as SpeciesRarity,
    core: 'tide' as Core,
    zone: 'Crater Coast' as Zone,
    color: '#f2e9ff',
    signalStyle: 'Unbroken tone',
    speed: 1.3,
    intro: false,
    encounterWeight: 0.2,
    lore: 'The moon that Lunara was named for walks its own coast. Nobody agrees on what it looks like up close.',
    signatureName: 'Crown of Lunara',
    catchSprite: '/creatures/placeholder.svg',
  },
] as const;
/** The tutorial is three catches. It does not grow with the roster. */
export const INTRO_SPECIES = SPECIES.filter((s) => s.intro);
