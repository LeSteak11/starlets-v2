import { BALANCE as B, SPECIES, type Rarity } from './balance.ts';
import type { Catalogue, StarletCard } from './cards.ts';
import type { Quality } from './game.ts';
/**
 * The flip. Every flip grants a card -- there is no failed catch and no
 * empty-handed encounter. Signal Lock is a flip with a skill ring priced in
 * Sparks; the free 12-hour pack is the same flip without the ring.
 *
 * Tether quality picks a rarity band. The band is then snapped to the nearest
 * printing the Starlet in the ring actually has: a miss on Glimmerelk pays its
 * rare base, because Glimmerelk has no common. The animal never changes.
 */
export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'legendary',
  'secret',
];
const rank = (rarity: Rarity) => RARITY_ORDER.indexOf(rarity);
/** Draws one key from a weight table. Consumes exactly one rng() call. */
export function weighted<K extends string>(
  table: Partial<Record<K, number>>,
  roll: number,
): K {
  const entries = Object.entries(table) as [K, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const [key, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return key;
  }
  return entries[entries.length - 1][0];
}
/**
 * Where a run of tethers lands. Perfect is worth two, Good one, Miss nothing,
 * measured against the best the player could have done in the tethers thrown --
 * so an encounter that ends early on three Perfects still reads as perfect.
 */
export function qualityBand(hits: readonly Quality[]): 'low' | 'mid' | 'high' {
  const counted = hits.filter((hit) => hit !== 'Near Miss');
  if (!counted.length) return 'low';
  const points = counted.reduce(
    (sum, hit) => sum + (hit === 'Perfect' ? 2 : hit === 'Good' ? 1 : 0),
    0,
  );
  const score = points / (counted.length * 2);
  return score >= B.flip.bandAt.high
    ? 'high'
    : score >= B.flip.bandAt.mid
      ? 'mid'
      : 'low';
}
/**
 * The nearest rarity this species actually prints. Ties go to the commoner
 * side, so snapping never quietly promotes a bad flip.
 */
export function snapToLine(
  line: readonly StarletCard[],
  target: Rarity,
): Rarity | null {
  const available = [...new Set(line.map((c) => c.rarity))];
  if (!available.length) return null;
  return available.reduce((best, rarity) =>
    Math.abs(rank(rarity) - rank(target)) <
      Math.abs(rank(best) - rank(target)) ||
    (Math.abs(rank(rarity) - rank(target)) ===
      Math.abs(rank(best) - rank(target)) &&
      rank(rarity) < rank(best))
      ? rarity
      : best,
  );
}
/**
 * One printing of one Starlet. The species is fixed -- this only decides which
 * of its cards you get. Consumes two rng() calls: band rarity, then printing.
 */
export function printingFor(
  catalogue: Catalogue,
  speciesId: string,
  band: 'low' | 'mid' | 'high',
  rng: () => number,
): StarletCard | null {
  const line = catalogue.lineFor(speciesId);
  if (!line.length) return null;
  const wanted = weighted<Rarity>(B.flip.bands[band], rng());
  const rarity = snapToLine(line, wanted);
  const matches = line.filter((c) => c.rarity === rarity);
  return matches[
    Math.min(matches.length - 1, Math.floor(rng() * matches.length))
  ];
}
/** Species that print a card at this rarity, for rarity-first pack rolls. */
export function speciesAt(catalogue: Catalogue, rarity: Rarity) {
  return SPECIES.filter((s) =>
    catalogue.lineFor(s.id).some((c) => c.rarity === rarity),
  );
}
/**
 * A pack slot. Packs roll rarity first and then pick a species that prints at
 * that rarity -- the opposite order from the ring, where the species is already
 * on screen. Rolling species first would strand most rolls on a species with no
 * card in the band.
 */
export function packSlot(
  catalogue: Catalogue,
  slot: number,
  rng: () => number,
  forceSecret = false,
): StarletCard | null {
  const table = B.packs.slots[slot] as Partial<Record<Rarity, number>>;
  const rarity = forceSecret ? 'secret' : weighted<Rarity>(table, rng());
  const pool = catalogue.all.filter((c) => c.rarity === rarity);
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
export type PackRoll = {
  cards: StarletCard[];
  pity: number;
  hitSecret: boolean;
};
/**
 * Five cards. Slots 1-3 are the floor and never reach rare; slot 4 guarantees
 * rare or better; slot 5 is the hit. A secret is guaranteed within
 * BALANCE.packs.secretPity flips, counted across every flip and reset by any
 * secret from any source.
 */
export function rollPack(
  catalogue: Catalogue,
  pity: number,
  rng: () => number,
): PackRoll {
  const cards: StarletCard[] = [];
  let counter = pity;
  let hitSecret = false;
  for (let slot = 0; slot < B.packs.size; slot++) {
    counter += 1;
    const last = slot === B.packs.size - 1;
    const card = packSlot(
      catalogue,
      slot,
      rng,
      last && counter >= B.packs.secretPity,
    );
    if (!card) continue;
    cards.push(card);
    if (card.rarity === 'secret') {
      hitSecret = true;
      counter = 0;
    }
  }
  return { cards, pity: counter, hitSecret };
}
