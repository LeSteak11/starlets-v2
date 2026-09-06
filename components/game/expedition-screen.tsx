'use client';

import { Check, Clock3, Compass, Sparkles, X } from 'lucide-react';
import { SPECIES } from '@/lib/balance';
import { CATALOGUE } from '@/lib/catalogue';
import {
  assignmentFor,
  claimExpedition,
  dispatchExpedition,
  expeditionResult,
  setExpeditionTeam,
  traitForCard,
  type ExpeditionMember,
} from '@/lib/expeditions';
import type { Save } from '@/lib/game';

type Props = {
  state: Save;
  now: number;
  update: (operation: (state: Save) => Save) => void;
};

const formatTime = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
};

export function ExpeditionScreen({ state, now, update }: Props) {
  const expedition = state.expedition;
  const assignment = assignmentFor(expedition);
  const result = expeditionResult(expedition);
  const active = expedition.startedAt !== null;
  const complete = active && now >= expedition.completesAt!;
  const discovered = SPECIES.filter(
    (species) => state.records[species.id].caught > 0,
  );

  const chooseMember = (speciesId: string) => {
    const existing = expedition.team.find(
      (member) => member.speciesId === speciesId,
    );
    let team: ExpeditionMember[];
    if (existing)
      team = expedition.team.filter((member) => member.speciesId !== speciesId);
    else {
      if (expedition.team.length >= 3) return;
      const owned = CATALOGUE.lineFor(speciesId).filter(
        (card) => state.owned[card.cardId],
      );
      const cardId =
        (state.equipped[speciesId] && state.owned[state.equipped[speciesId]]
          ? state.equipped[speciesId]
          : (owned.find((card) => card.isBase)?.cardId ?? owned[0]?.cardId)) ??
        '';
      if (!cardId) return;
      team = [...expedition.team, { speciesId, cardId }];
    }
    update((save) => setExpeditionTeam(save, team));
  };

  const chooseCard = (speciesId: string, cardId: string) => {
    const team = expedition.team.map((member) =>
      member.speciesId === speciesId ? { ...member, cardId } : member,
    );
    update((save) => setExpeditionTeam(save, team));
  };

  if (active) {
    return (
      <section className="expedition-active" aria-live="polite">
        <div className={`expedition-beacon ${complete ? 'complete' : ''}`}>
          {complete ? <Sparkles size={34} /> : <Compass size={34} />}
        </div>
        <p className="eyebrow">{assignment.destination.toUpperCase()}</p>
        <h2>{complete ? 'Your team has returned.' : 'Expedition underway'}</h2>
        <p>
          {complete
            ? `${expedition.tier} · ${expedition.reward} Stardust is waiting.`
            : `Returning in ${formatTime(expedition.completesAt! - now)}. You can safely close the game.`}
        </p>
        <div className="expedition-away-team">
          {expedition.team.map((member) => {
            const species = SPECIES.find(
              (item) => item.id === member.speciesId,
            )!;
            return (
              <span key={member.speciesId}>
                {species.name} <b>{traitForCard(member.cardId)}</b>
              </span>
            );
          })}
        </div>
        {complete ? (
          <button
            className="primary expedition-claim"
            onClick={() => update((save) => claimExpedition(save, now))}
          >
            Claim {expedition.reward} Stardust
          </button>
        ) : (
          <div className="return-time">
            <Clock3 size={17} /> Return time is saved
          </div>
        )}
      </section>
    );
  }

  const suggestions = expedition.team.flatMap((member) => {
    const currentTrait = traitForCard(member.cardId);
    return CATALOGUE.lineFor(member.speciesId)
      .filter(
        (card) =>
          state.owned[card.cardId] &&
          card.cardId !== member.cardId &&
          result.missing.includes(traitForCard(card.cardId)) &&
          !result.matched.includes(traitForCard(card.cardId)),
      )
      .slice(0, 1)
      .map((card) => ({
        member,
        card,
        currentTrait,
        trait: traitForCard(card.cardId),
      }));
  });

  return (
    <section className="expedition-layout">
      <article className="mission-card">
        <div className="mission-kicker">
          <Compass size={18} /> EXPEDITION
        </div>
        <h2>{assignment.destination}</h2>
        <p>{assignment.reason}</p>
        <div className="trait-request" aria-label="Recommended traits">
          {assignment.recommendedTraits.map((trait) => {
            const matched = result.matched.includes(trait);
            return (
              <span className={matched ? 'matched' : ''} key={trait}>
                {matched ? <Check size={15} /> : <X size={15} />} {trait}
              </span>
            );
          })}
        </div>
        <dl className="mission-facts">
          <div>
            <dt>Result</dt>
            <dd>{result.tier}</dd>
          </div>
          <div>
            <dt>Reward</dt>
            <dd>{result.reward} Stardust</dd>
          </div>
          <div>
            <dt>Return</dt>
            <dd>
              {state.expeditionsCompleted === 0 ? '10 seconds' : '5 minutes'}
            </dd>
          </div>
        </dl>
        {suggestions.length > 0 && (
          <div className="card-advice">
            <Sparkles size={17} />
            <span>
              Switch {CATALOGUE.get(suggestions[0].member.cardId)?.name} to{' '}
              <b>{suggestions[0].card.subtitle ?? 'Base'}</b> for{' '}
              <b>{suggestions[0].trait}</b> and improve this team.
            </span>
          </div>
        )}
        <button
          className="primary expedition-dispatch"
          disabled={expedition.team.length === 0}
          onClick={() => update((save) => dispatchExpedition(save, now))}
        >
          Dispatch {expedition.team.length || ''} Starlet
          {expedition.team.length === 1 ? '' : 's'}
        </button>
      </article>

      <div className="team-builder">
        <div className="team-heading">
          <div>
            <p className="eyebrow">YOUR TEAM</p>
            <h2>Choose up to three</h2>
          </div>
          <span>{expedition.team.length} / 3</span>
        </div>
        {discovered.length === 0 ? (
          <div className="empty-team">
            <h3>No Starlets home yet</h3>
            <p>
              Use the Scanner to discover Mossbun, Emberpanda, and Novafox
              first.
            </p>
          </div>
        ) : (
          <div className="starlet-roster">
            {discovered.map((species) => {
              const member = expedition.team.find(
                (item) => item.speciesId === species.id,
              );
              const owned = CATALOGUE.lineFor(species.id).filter(
                (card) => state.owned[card.cardId],
              );
              return (
                <article
                  className={`team-starlet ${member ? 'selected' : ''}`}
                  key={species.id}
                >
                  <button
                    className="starlet-select"
                    onClick={() => chooseMember(species.id)}
                    aria-pressed={!!member}
                    disabled={!member && expedition.team.length >= 3}
                  >
                    <span
                      className="starlet-avatar"
                      style={
                        {
                          '--starlet-color': species.color,
                        } as React.CSSProperties
                      }
                    >
                      {species.name.slice(0, 1)}
                    </span>
                    <span>
                      <b>{species.name}</b>
                      <small>{member ? 'On team' : 'Tap to add'}</small>
                    </span>
                    <span className="select-mark">
                      {member ? <Check size={17} /> : '+'}
                    </span>
                  </button>
                  {member && (
                    <div
                      className="card-choices"
                      aria-label={`${species.name} cards`}
                    >
                      {owned.map((card) => (
                        <button
                          key={card.cardId}
                          className={
                            member.cardId === card.cardId ? 'active' : ''
                          }
                          onClick={() => chooseCard(species.id, card.cardId)}
                          aria-pressed={member.cardId === card.cardId}
                        >
                          <span>{card.subtitle ?? 'Base card'}</span>
                          <b>{traitForCard(card.cardId)}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
