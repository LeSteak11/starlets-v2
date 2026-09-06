'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ART_PLACEHOLDER, binderPages, secretTray } from '@/lib/cards';
import type { StarletCard } from '@/lib/cards';
import { CATALOGUE } from '@/lib/catalogue';
import { label } from '@/lib/balance';
import { track } from '@/lib/analytics';
import type { Save } from '@/lib/game';
const PAGES = binderPages(CATALOGUE.all);
const TRAY = secretTray(CATALOGUE.all);
/** Card art can land after the card does, so a missing file falls back. */
function CardArt({ card, owned }: { card: StarletCard; owned: boolean }) {
  return (
    <Image
      key={card.art}
      unoptimized
      width={1024}
      height={1434}
      src={owned ? card.art : ART_PLACEHOLDER}
      alt={owned ? card.name : 'Empty slot'}
      onError={(event) => {
        (event.currentTarget as HTMLImageElement).src = ART_PLACEHOLDER;
      }}
    />
  );
}
function Slot({
  card,
  count,
  onOpen,
}: {
  card: StarletCard;
  count: number;
  onOpen: (cardId: string) => void;
}) {
  const owned = count > 0;
  return (
    <button
      className={`binder-slot ${owned ? '' : 'empty'} rarity-${card.rarity}`}
      onClick={() => onOpen(card.cardId)}
      aria-label={
        owned
          ? `${card.name}${card.subtitle ? ' ' + card.subtitle : ''}, ${card.rarity}`
          : `Empty slot ${card.number ?? 'secret'}`
      }
    >
      <div className={`card-art ${owned ? '' : 'unseen'}`}>
        <CardArt card={card} owned={owned} />
      </div>
      <span className="slot-number">
        {card.number === null ? (
          <Lock size={12} />
        ) : (
          String(card.number).padStart(3, '0')
        )}
      </span>
      {count > 1 && <span className="slot-count">×{count}</span>}
      <span className="slot-name">{owned ? card.name : '—'}</span>
    </button>
  );
}
export function BinderScreen({
  state,
  onOpenCard,
}: {
  state: Save | null;
  onOpenCard: (cardId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const held = (cardId: string) => state?.owned[cardId]?.count ?? 0;
  const current = PAGES[page];
  const ownedOnPage = current.cards.filter((c) => held(c.cardId) > 0).length;
  // One event per page the player actually turns to -- not one per save write.
  const turnTo = (next: number) => {
    if (next === page) return;
    const cards = PAGES[next].cards;
    setPage(next);
    track({
      name: 'page_progress',
      zone: PAGES[next].zone,
      owned: cards.filter((c) => held(c.cardId) > 0).length,
      total: cards.length,
    });
  };
  const trayOwned = TRAY.filter((c) => held(c.cardId) > 0).length;
  const setOwned = CATALOGUE.all.filter((c) => held(c.cardId) > 0).length;
  return (
    <section className="binder">
      <header className="binder-head">
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => turnTo(Math.max(0, page - 1))}
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <p className="eyebrow">
            PAGE {page + 1} OF {PAGES.length}
          </p>
          <h2>{current.zone}</h2>
          <span className="page-count">
            {ownedOnPage} / {current.cards.length} on this page
          </span>
        </div>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={page === PAGES.length - 1}
          onClick={() => turnTo(Math.min(PAGES.length - 1, page + 1))}
        >
          <ChevronRight size={18} />
        </button>
      </header>
      <Progress
        value={(ownedOnPage / current.cards.length) * 100}
        aria-label={`${current.zone} completion`}
      />
      <div className="binder-page">
        {current.cards.map((card) => (
          <Slot
            key={card.cardId}
            card={card}
            count={held(card.cardId)}
            onOpen={onOpenCard}
          />
        ))}
      </div>
      <section className="chase-tray">
        <p className="eyebrow">
          CHASE TRAY · {trayOwned}/{TRAY.length}
        </p>
        <p className="save-note">Unlisted. No number, no slot on any page.</p>
        <div className="tray-row">
          {TRAY.map((card) => (
            <Slot
              key={card.cardId}
              card={card}
              count={held(card.cardId)}
              onOpen={onOpenCard}
            />
          ))}
        </div>
      </section>
      <p className="save-note">
        {setOwned} of {CATALOGUE.all.length} printings held ·{' '}
        {label(CATALOGUE.all[0].setId)} · Saved on this browser
      </p>
    </section>
  );
}
