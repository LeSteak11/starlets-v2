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
  /**
   * Binder order, 1-based -- or null for a secret, which is an unlisted chase
   * card with no slot in the binder and no number on its face.
   */
  number: number | null;
  /** Count of numbered cards, so `012/27` renders without a lookup. */
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
export const isSecret = (card: StarletCard) => card.number === null;
export const cardCode = (card: StarletCard) =>
  card.number === null
    ? `${card.setId}/SECRET`
    : `${card.setId}/${String(card.number).padStart(3, '0')}`;
/** Secrets deliberately show no counter -- an unlisted card has no position. */
export const cardCounter = (card: StarletCard) =>
  card.number === null
    ? 'UNLISTED'
    : `${String(card.number).padStart(3, '0')}/${card.numberMax}`;
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
/**
 * Binder pages are zones and zones are pages -- fixed 3x3, nine slots each.
 * Zones are scan flavour and page identity, not a separate collection type.
 * Secrets are excluded: they live in the chase tray, off the numbered pages.
 */
export type BinderPage = { zone: Zone; cards: readonly StarletCard[] };
export function binderPages(cards: readonly StarletCard[]): BinderPage[] {
  const zones = [...new Set(SPECIES.map((s) => s.zone))] as Zone[];
  return zones
    .map((zone) => ({
      zone,
      cards: cards
        .filter((c) => c.zone === zone && c.number !== null)
        .sort((a, b) => a.number! - b.number!),
    }))
    // Pages run in card order, not roster order: page 1 is 001-009.
    .sort((a, b) => (a.cards[0]?.number ?? 0) - (b.cards[0]?.number ?? 0));
}
/** The unlisted chase tray, in set order. */
export const secretTray = (cards: readonly StarletCard[]) =>
  cards.filter(isSecret);
