import { SPECIES, type Core, type Rarity, type Zone } from './balance.ts';
/**
 * Types, lookups and helpers for the card catalogue.
 *
 * THIS FILE MUST NEVER CONTAIN A CARD. Card content lives in content/set-01.ts
 * and is authored by design, not engineering. Validation lives in
 * scripts/content-check.ts and runs as `npm run content:check`.
 */
export type Finish = 'matte' | 'foil' | 'fullart' | 'secret';
/**
 * `role` is what the card is in the set structure; `finish` is how it is
 * printed. They are independent on purpose -- a pose card can be foil.
 */
export type CardRole = 'base' | 'pose' | 'foil' | 'fullart' | 'secret';
export type StarletCard = {
  /** 'LUN-01-012'. Set and number only -- stable forever, never reused. */
  cardId: string;
  setId: string;
  /** Binder order, 1-based. */
  number: number;
  /** Set size, so `012/28` renders without a lookup. */
  numberMax: number;
  speciesId: string;
  name: string;
  /** Second line on the card face. Omitted on base cards. */
  subtitle?: string;
  rarity: Rarity;
  finish: Finish;
  role: CardRole;
  art: string;
  /** Copied from the species at authoring time; content:check keeps it honest. */
  core: Core;
  zone: Zone;
  illustrator: string;
  /** Bump to swap art without changing cardId. */
  version: number;
  /** Exactly one true per species: the slot a catch fills. */
  isBase: boolean;
};
export const FINISHES: Finish[] = ['matte', 'foil', 'fullart', 'secret'];
export const CARD_ROLES: CardRole[] = [
  'base',
  'pose',
  'foil',
  'fullart',
  'secret',
];
/**
 * A missing image is a Tuesday, not an outage. UI renders card art with
 * `onError` falling back to this, so art can land after the card does.
 */
export const ART_PLACEHOLDER = '/creatures/placeholder.svg';
export const cardCode = (card: StarletCard) =>
  `${card.setId}/${String(card.number).padStart(3, '0')}`;
export const cardCounter = (card: StarletCard) =>
  `${String(card.number).padStart(3, '0')}/${card.numberMax}`;
export function buildCatalogue(cards: readonly StarletCard[]) {
  const byId = new Map(cards.map((c) => [c.cardId, c]));
  const bySpecies = new Map<string, StarletCard[]>();
  for (const card of cards) {
    const line = bySpecies.get(card.speciesId);
    if (line) line.push(card);
    else bySpecies.set(card.speciesId, [card]);
  }
  return {
    all: cards,
    byId,
    bySpecies,
    get: (cardId: string) => byId.get(cardId),
    /** The card a catch grants. content:check guarantees exactly one. */
    baseFor: (speciesId: string) =>
      (bySpecies.get(speciesId) ?? []).find((c) => c.isBase),
    lineFor: (speciesId: string) => bySpecies.get(speciesId) ?? [],
  };
}
export type Catalogue = ReturnType<typeof buildCatalogue>;
/** Binder pages are zones. Zone completion is a page, not a new system. */
export type BinderPage = { zone: Zone; cards: readonly StarletCard[] };
export function binderPages(cards: readonly StarletCard[]): BinderPage[] {
  const zones = [...new Set(SPECIES.map((s) => s.zone))] as Zone[];
  return zones.map((zone) => ({
    zone,
    cards: cards.filter((c) => c.zone === zone),
  }));
}
