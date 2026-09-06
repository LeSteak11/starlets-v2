'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Gem, PackageOpen, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ART_PLACEHOLDER, cardCounter } from '@/lib/cards';
import { CATALOGUE } from '@/lib/catalogue';
import { BALANCE as B, label } from '@/lib/balance';
import { track } from '@/lib/analytics';
import { accruePacks, openPack } from '@/lib/game';
import type { PackOpening, Save } from '@/lib/game';
const RARITY_ROWS = [
  'common',
  'uncommon',
  'rare',
  'legendary',
  'secret',
] as const;
const untilNext = (state: Save, now: number) =>
  Math.max(0, B.packs.timerMs - (now - state.packs.accruedAt));
const clock = (ms: number) => {
  const total = Math.ceil(ms / 60000);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
};
export function PacksScreen({
  state,
  now,
  update,
}: {
  state: Save | null;
  now: number;
  update: (operation: (s: Save) => Save) => void;
}) {
  const [opening, setOpening] = useState<PackOpening | null>(null);
  const [revealed, setRevealed] = useState(0);
  const stored = state ? accruePacks(state, now).packs.stored : 0;
  const pity = state?.packs.pity ?? 0;
  const showPity = pity >= B.packs.pityVisibleFrom;
  const open = () => {
    if (!state || stored < 1) return;
    let result: PackOpening | null = null;
    update((s) => {
      const rolled = openPack(s, Math.random, Date.now());
      result = rolled.opening;
      return rolled.save;
    });
    if (!result) return;
    track({
      name: 'pack_open',
      source: 'timer',
      pity,
      opened: (state.packs.opened ?? 0) + 1,
    });
    for (const cardId of (result as PackOpening).cardIds) {
      const card = CATALOGUE.get(cardId);
      if (!card) continue;
      track({
        name: 'card_granted',
        cardId,
        rarity: card.rarity,
        speciesId: card.speciesId,
        source: 'pack',
        newSlot: (result as PackOpening).newSlots.includes(cardId),
        duplicate: !!state.owned[cardId],
      });
    }
    setOpening(result);
    setRevealed(0);
  };
  if (opening) {
    const card = CATALOGUE.get(opening.cardIds[revealed]);
    const last = revealed >= opening.cardIds.length - 1;
    return (
      <section className="pack-reveal" aria-live="polite">
        <p className="eyebrow">
          CARD {revealed + 1} OF {opening.cardIds.length}
        </p>
        {card && (
          <>
            <div className={`reveal-card rarity-${card.rarity}`}>
              <Image
                unoptimized
                width={1024}
                height={1434}
                src={card.art}
                alt={card.name}
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).src =
                    ART_PLACEHOLDER;
                }}
              />
            </div>
            <h2 className="result-label">{card.name}</h2>
            <p>
              {card.subtitle ? `${card.subtitle} · ` : ''}
              {label(card.rarity)} · {cardCounter(card)}
            </p>
            {opening.newSlots.includes(card.cardId) && (
              <p className="eyebrow">NEW STARBOOK ENTRY</p>
            )}
          </>
        )}
        <div className="result-actions">
          <button
            className="primary"
            onClick={() =>
              last ? setOpening(null) : setRevealed((n) => n + 1)
            }
          >
            {last ? 'Done' : 'Next card'}
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="packs-layout">
      <article className="panel">
        <p className="eyebrow">FREE PACK</p>
        <div className="metric">
          {stored} <span>/ {B.packs.stored} stored</span>
        </div>
        <p>
          {stored >= B.packs.stored
            ? 'Your packs are full. Open one to restart the timer.'
            : state
              ? `Next pack in ${clock(untilNext(state, now))}.`
              : '—'}
        </p>
        <button className="primary" disabled={stored < 1} onClick={open}>
          <PackageOpen size={18} /> Open a pack
        </button>
        {showPity && (
          <>
            <Progress
              value={(pity / B.packs.secretPity) * 100}
              aria-label="Secret guarantee progress"
            />
            <small>
              A secret is guaranteed within {B.packs.secretPity - pity} more
              flips.
            </small>
          </>
        )}
        <div className="reward-line">
          <Sparkles size={16} /> {state?.stardust ?? 0} Stardust
          <Gem size={16} /> {state?.shards ?? 0} Shards
        </div>
      </article>
      <article className="panel note">
        <p className="eyebrow">ODDS</p>
        <h3>Five cards. Published, not buried.</h3>
        <table className="odds-table">
          <thead>
            <tr>
              <th>Slot</th>
              {RARITY_ROWS.map((rarity) => (
                <th key={rarity}>{label(rarity).slice(0, 4)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {B.packs.slots.map((slot, index) => {
              const odds = slot as Partial<Record<string, number>>;
              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  {RARITY_ROWS.map((rarity) => (
                    <td key={rarity}>
                      {odds[rarity]
                        ? `${Math.round(odds[rarity]! * 100)}%`
                        : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <small>
          Slots 1–3 never reach rare, so slot 4 keeps its meaning. A secret is
          guaranteed within {B.packs.secretPity} flips.
        </small>
      </article>
    </section>
  );
}
