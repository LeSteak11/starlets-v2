import { BALANCE as B } from './balance.ts';
import { CATALOGUE } from './catalogue.ts';
import { CARD_TRAITS, EXPEDITION_ASSIGNMENTS } from '../content/expeditions.ts';
import type { Save } from './game.ts';

export const EXPEDITION_TRAITS = [
  'Curious',
  'Swift',
  'Gentle',
  'Forager',
  'Navigator',
  'Night Sight',
] as const;
export type ExpeditionTrait = (typeof EXPEDITION_TRAITS)[number];
export type ExpeditionTier = 'Ready' | 'Strong Match' | 'Perfect Match';
export type ExpeditionAssignment = {
  id: string;
  destination: string;
  reason: string;
  recommendedTraits: readonly ExpeditionTrait[];
};
export type ExpeditionMember = { speciesId: string; cardId: string };
export type ExpeditionState = {
  assignmentIndex: number;
  team: ExpeditionMember[];
  startedAt: number | null;
  completesAt: number | null;
  tier: ExpeditionTier | null;
  reward: number | null;
};

export const emptyExpedition = (assignmentIndex = 0): ExpeditionState => ({
  assignmentIndex: assignmentIndex % EXPEDITION_ASSIGNMENTS.length,
  team: [],
  startedAt: null,
  completesAt: null,
  tier: null,
  reward: null,
});

export const assignmentFor = (state: ExpeditionState) =>
  EXPEDITION_ASSIGNMENTS[state.assignmentIndex % EXPEDITION_ASSIGNMENTS.length];

export const traitForCard = (cardId: string) => CARD_TRAITS[cardId];

export function expeditionResult(state: ExpeditionState) {
  const assignment = assignmentFor(state);
  const contributed = new Set(
    state.team.map((member) => traitForCard(member.cardId)).filter(Boolean),
  );
  const matched = assignment.recommendedTraits.filter((trait) =>
    contributed.has(trait),
  );
  const missing = assignment.recommendedTraits.filter(
    (trait) => !contributed.has(trait),
  );
  const count = matched.length;
  const tier: ExpeditionTier =
    count === assignment.recommendedTraits.length
      ? 'Perfect Match'
      : count >= 2
        ? 'Strong Match'
        : 'Ready';
  return { matched, missing, tier, reward: B.expeditions.rewards[tier] };
}

export function setExpeditionTeam(save: Save, team: ExpeditionMember[]): Save {
  if (save.expedition.startedAt !== null || team.length > 3) return save;
  const speciesIds = new Set<string>();
  for (const member of team) {
    const card = CATALOGUE.get(member.cardId);
    if (
      speciesIds.has(member.speciesId) ||
      !card ||
      card.speciesId !== member.speciesId ||
      !save.owned[member.cardId] ||
      save.records[member.speciesId]?.caught < 1
    )
      return save;
    speciesIds.add(member.speciesId);
  }
  const equipped = { ...save.equipped };
  for (const member of team) equipped[member.speciesId] = member.cardId;
  return { ...save, equipped, expedition: { ...save.expedition, team } };
}

export function dispatchExpedition(save: Save, now = Date.now()): Save {
  const expedition = save.expedition;
  if (expedition.startedAt !== null || expedition.team.length === 0)
    return save;
  const validated = setExpeditionTeam(save, expedition.team);
  if (validated === save) return save;
  const result = expeditionResult(expedition);
  const duration =
    save.expeditionsCompleted === 0
      ? B.expeditions.firstDurationMs
      : B.expeditions.repeatDurationMs;
  return {
    ...validated,
    expedition: {
      ...validated.expedition,
      startedAt: now,
      completesAt: now + duration,
      tier: result.tier,
      reward: result.reward,
    },
  };
}

export function claimExpedition(save: Save, now = Date.now()): Save {
  const expedition = save.expedition;
  if (
    expedition.startedAt === null ||
    expedition.completesAt === null ||
    now < expedition.completesAt ||
    expedition.reward === null
  )
    return save;
  return {
    ...save,
    stardust: save.stardust + expedition.reward,
    expeditionsCompleted: save.expeditionsCompleted + 1,
    expedition: emptyExpedition(expedition.assignmentIndex + 1),
  };
}
