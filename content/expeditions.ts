import type {
  ExpeditionAssignment,
  ExpeditionTrait,
} from '../lib/expeditions.ts';

/** Editable prototype content. Rarity is intentionally absent from this map. */
export const CARD_TRAITS: Record<string, ExpeditionTrait> = {
  'LUN-01-001': 'Gentle',
  'LUN-01-002': 'Curious',
  'LUN-01-003': 'Forager',
  'LUN-01-004': 'Night Sight',
  'LUN-01-005': 'Curious',
  'LUN-01-006': 'Navigator',
  'LUN-01-007': 'Swift',
  'LUN-01-008': 'Gentle',
  'LUN-01-009': 'Night Sight',
  'LUN-01-010': 'Swift',
  'LUN-01-011': 'Navigator',
  'LUN-01-012': 'Night Sight',
  'LUN-01-013': 'Navigator',
  'LUN-01-014': 'Forager',
  'LUN-01-015': 'Gentle',
  'LUN-01-016': 'Night Sight',
  'LUN-01-017': 'Navigator',
  'LUN-01-018': 'Curious',
  'LUN-01-019': 'Forager',
  'LUN-01-020': 'Gentle',
  'LUN-01-021': 'Curious',
  'LUN-01-022': 'Navigator',
  'LUN-01-023': 'Night Sight',
  'LUN-01-024': 'Swift',
  'LUN-01-025': 'Night Sight',
  'LUN-01-026': 'Curious',
  'LUN-01-027': 'Navigator',
  'LUN-01-S1': 'Swift',
  'LUN-01-S2': 'Forager',
  'LUN-01-S3': 'Gentle',
};

/** One reusable destination with rotating requests. */
export const EXPEDITION_ASSIGNMENTS: readonly ExpeditionAssignment[] = [
  {
    id: 'moon-garden-echoes',
    destination: 'Moon Garden',
    reason: 'Gather seeds that only open beneath the evening constellations.',
    recommendedTraits: ['Curious', 'Navigator', 'Night Sight'],
  },
  {
    id: 'moon-garden-burrows',
    destination: 'Moon Garden',
    reason: 'Carry supplies through the quiet burrows before the dew rises.',
    recommendedTraits: ['Gentle', 'Forager', 'Swift'],
  },
  {
    id: 'moon-garden-trail',
    destination: 'Moon Garden',
    reason: 'Chart a new trail around the garden’s shifting pools.',
    recommendedTraits: ['Navigator', 'Swift', 'Curious'],
  },
];
