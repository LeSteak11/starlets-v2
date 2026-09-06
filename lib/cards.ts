import { BALANCE as B, SPECIES, type Core, type Rarity, type Zone } from './balance.ts';
/**
 * Species = character. Card = collectible SKU: a pose, a frame and a finish.
 * The same Starlet can be Common on its base card and Secret on a night slab.
 * Every species has exactly one base card -- that is the Starbook slot a catch
 * fills. Alts may outrank the base. No card belongs to a species outside the
 * roster: the silhouette book and the album must never diverge.
 */
export type CardKind = 'base' | 'pose' | 'foil' | 'fullart' | 'secret';
export type CardDef = {
  id: string;
  setId: 'lunara-01';
  /** Binder position, 1-based. Printed as LUN/01 .. LUN/28. */
  number: number;
  speciesId: string;
  /** Art name, not the species name. */
  title: string;
  kind: CardKind;
  rarity: Rarity;
  foil: boolean;
  fullArt: boolean;
  art: string;
};
const PLACEHOLDER = '/creatures/placeholder.svg';
const card = (
  number: number,
  speciesId: string,
  title: string,
  kind: CardKind,
  rarity: Rarity,
): CardDef => {
  const species = SPECIES.find((s) => s.id === speciesId);
  if (!species) throw new Error(`Card ${number} names a species outside the roster`);
  return {
    id: `lun-${String(number).padStart(3, '0')}-${speciesId}-${kind}`,
    setId: 'lunara-01',
    number,
    speciesId,
    title,
    kind,
    rarity,
    foil: kind === 'foil' || kind === 'secret',
    fullArt: kind === 'fullart' || kind === 'secret',
    // Base cards borrow the species portrait until final card art lands.
    art: kind === 'base' ? species.art : PLACEHOLDER,
  };
};
/** Set 01 -- "Lunara: First Light". 28 cards, 8 Starlets, frozen. */
export const SET_01: readonly CardDef[] = [
  card(1, 'mossbun', 'Mossbun', 'base', 'Common'),
  card(2, 'mossbun', 'Garden Drift', 'pose', 'Common'),
  card(3, 'mossbun', 'Moss Light', 'foil', 'Uncommon'),
  card(4, 'mossbun', 'The Listening Field', 'fullart', 'Rare'),
  card(5, 'emberpanda', 'Emberpanda', 'base', 'Common'),
  card(6, 'emberpanda', 'Banked Coals', 'pose', 'Uncommon'),
  card(7, 'emberpanda', 'Emberglow', 'foil', 'Rare'),
  card(8, 'emberpanda', 'Nightwatch', 'secret', 'Secret'),
  card(9, 'novafox', 'Novafox', 'base', 'Rare'),
  card(10, 'novafox', 'Tideline Sprint', 'pose', 'Rare'),
  card(11, 'novafox', 'Comet Trail', 'foil', 'Legendary'),
  card(12, 'dewlark', 'Dewlark', 'base', 'Common'),
  card(13, 'dewlark', 'Morning Chorus', 'pose', 'Common'),
  card(14, 'dewlark', 'Dewfall', 'foil', 'Uncommon'),
  card(15, 'dewlark', 'The Quiet Meadow', 'fullart', 'Rare'),
  card(16, 'shellune', 'Shellune', 'base', 'Uncommon'),
  card(17, 'shellune', 'Low Tide', 'pose', 'Uncommon'),
  card(18, 'shellune', 'Pearl Current', 'foil', 'Rare'),
  card(19, 'cindermoth', 'Cindermoth', 'base', 'Uncommon'),
  card(20, 'cindermoth', 'Ash Bloom', 'pose', 'Rare'),
  card(21, 'cindermoth', 'Emberwing', 'foil', 'Rare'),
  card(22, 'glimmerelk', 'Glimmerelk', 'base', 'Rare'),
  card(23, 'glimmerelk', 'Antler Dawn', 'foil', 'Legendary'),
  card(24, 'glimmerelk', 'First Contact', 'secret', 'Secret'),
  card(25, 'selenith', 'Selenith', 'base', 'Legendary'),
  card(26, 'selenith', 'Moonrise', 'pose', 'Legendary'),
  card(27, 'selenith', 'Crown of Lunara', 'fullart', 'Legendary'),
  card(28, 'selenith', 'Night Slab', 'secret', 'Secret'),
];
export const CARDS_BY_ID = new Map(SET_01.map((c) => [c.id, c]));
export const cardNumber = (c: CardDef) => `LUN/${String(c.number).padStart(2, '0')}`;
/** The card a catch grants. Exactly one per species, by construction. */
export const baseCardFor = (speciesId: string): CardDef =>
  SET_01.find((c) => c.speciesId === speciesId && c.kind === 'base')!;
/** Binder pages are zones, not fixed 9-slot sheets. Zone completion is a page. */
export type BinderPage = { zone: Zone; core: Core; cards: readonly CardDef[] };
export const BINDER_PAGES: readonly BinderPage[] = (
  ['Moon Garden', 'Crater Coast', 'Prism Caves'] as const
).map((zone) => ({
  zone,
  core: SPECIES.find((s) => s.zone === zone)!.core,
  cards: SET_01.filter(
    (c) => SPECIES.find((s) => s.id === c.speciesId)!.zone === zone,
  ),
}));
/** Fail loudly at import if the set drifts from the locked shape. */
{
  const counted: Record<string, number> = {};
  for (const c of SET_01) counted[c.rarity] = (counted[c.rarity] ?? 0) + 1;
  const drift =
    SET_01.length !== B.set01.cards ||
    SET_01.some((c, i) => c.number !== i + 1) ||
    new Set(SET_01.map((c) => c.id)).size !== SET_01.length ||
    SPECIES.some(
      (s) => SET_01.filter((c) => c.speciesId === s.id && c.kind === 'base').length !== 1,
    ) ||
    (Object.keys(B.set01.byRarity) as Rarity[]).some(
      (r) => counted[r] !== B.set01.byRarity[r],
    );
  if (drift) throw new Error('Set 01 no longer matches the locked shape');
}
