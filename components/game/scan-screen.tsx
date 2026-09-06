'use client';
import Image from 'next/image';
import {
  ArrowUpRight,
  Crosshair,
  Gem,
  Radar,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SignalOrbit } from '@/components/game/signal-orbit';
import { INTRO_SPECIES, SPECIES, label } from '@/lib/balance';
import { cardCounter } from '@/lib/cards';
import { CATALOGUE } from '@/lib/catalogue';
import { track } from '@/lib/analytics';
import { qualityBand } from '@/lib/flip';
import { beginEncounter, dismissResult, scan, tether } from '@/lib/game';
import type { Encounter, Save } from '@/lib/game';
type Species = (typeof SPECIES)[number];
const INTRO_COUNT = INTRO_SPECIES.length;
const SET_COUNT = SPECIES.length;
export function ScanScreen({
  state,
  e,
  species,
  intro,
  countdown,
  discovered,
  paused,
  update,
  startScan,
  setTab,
  setSettings,
}: {
  state: Save | null;
  e: Encounter | null | undefined;
  species: Species | null;
  intro: boolean;
  countdown: number;
  discovered: number;
  paused: boolean;
  update: (operation: (s: Save) => Save) => void;
  startScan: () => void;
  setTab: (tab: 'scan' | 'book') => void;
  setSettings: (open: boolean) => void;
}) {
  const granted = e?.granted ? CATALOGUE.get(e.granted) : null;
  const lockPassed = e?.hits.some((hit) => hit === 'Good' || hit === 'Perfect');
  const countedLockHits =
    e?.hits.filter((hit) => hit !== 'Near Miss').slice(0, 3) ?? [];
  return (
    <section className="scanner-layout">
      <div className="scanner-stage">
        <div className="coordinates">
          LN—{species?.number ?? '000'}
          <span>
            {e?.stage === 'lock' ? 'TETHER ARRAY / ACTIVE' : 'LIVE FREQUENCY'}
          </span>
        </div>
        {!e && (
          <>
            <div className="radar">
              <Radar size={62} />
              <div className="sweep" />
            </div>
            <div className="scanner-caption">
              <span className="eyebrow">
                {intro
                  ? `FIRST CONTACT / ${(state?.introStep ?? 0) + 1} OF ${INTRO_COUNT}`
                  : 'LUNARA SIGNAL NETWORK'}
              </span>
              <h2>
                {intro
                  ? 'Your next discovery awaits'
                  : 'Find your next connection'}
              </h2>
              <p>
                {intro
                  ? `${INTRO_COUNT} signals. ${INTRO_COUNT} new entries in your Starbook.`
                  : 'Trace a mystery signal from one of Lunara’s habitats.'}
              </p>
              <button className="primary" disabled={!state} onClick={startScan}>
                Scan for Starlets <ArrowUpRight size={19} />
              </button>
              <small>
                {intro
                  ? 'Introductory flips are free · +1 Spark each'
                  : countdown
                    ? `${state?.sparks} Sparks available · Next Spark in ${countdown}m`
                    : `${state?.sparks} Sparks available · Reserve full`}
              </small>
            </div>
          </>
        )}
        {e?.stage === 'signal' && species && (
          <>
            <div className="art-orbit unseen">
              <Image
                unoptimized
                width={1024}
                height={1024}
                src={species.catchSprite}
                alt="Unidentified Starlet silhouette"
              />
            </div>
            <div className="scanner-caption">
              <span className="eyebrow">
                {e.intro ? 'FIRST CONTACT SIGNAL' : 'UNIDENTIFIED SIGNAL'}
              </span>
              <h2>Something is reaching back.</h2>
              <p>Lock onto this frequency to reveal the Starlet.</p>
              <button
                className="primary"
                disabled={!e.intro && (state?.sparks ?? 0) < 1}
                onClick={() => update((s) => beginEncounter(s))}
              >
                <Crosshair size={18} />
                Begin Signal Lock{!e.intro && ' · 1 Spark'}
              </button>
              <small>
                {e.intro
                  ? 'Free encounter · Assisted capture · +1 Spark reward'
                  : (state?.sparks ?? 0) < 1
                    ? `Next Spark in ${countdown}m. This signal will wait for you.`
                    : '3 attempts · Yellow near misses retry for free'}
              </small>
            </div>
          </>
        )}
        {e?.stage === 'lock' && (
          <SignalOrbit
            key={`${e.speciesId}-${e.intro}`}
            encounter={e}
            slow={state?.slowTiming ?? false}
            paused={paused}
            onTether={(angle, targetAngle) =>
              update((s) => {
                const next = tether(
                  s,
                  angle,
                  Date.now(),
                  Math.random,
                  targetAngle,
                );
                const result = next.encounter;
                const card = result?.granted
                  ? CATALOGUE.get(result.granted)
                  : null;
                if (card && result)
                  track({
                    name: 'card_granted',
                    cardId: card.cardId,
                    rarity: card.rarity,
                    speciesId: card.speciesId,
                    source: result.intro ? 'intro' : 'flip',
                    newSlot: result.newSlot,
                    duplicate: result.duplicate,
                    band: qualityBand(result.hits),
                  });
                return next;
              })
            }
          />
        )}
        {e?.stage === 'result' && species && (
          <>
            <div className="art-orbit">
              <Image
                unoptimized
                width={1024}
                height={1024}
                src={species.catchSprite}
                alt={species.name}
              />
            </div>
            <div className="scanner-caption" aria-live="polite">
              <div className={`lock-outcome ${lockPassed ? 'pass' : 'fail'}`}>
                Signal Lock {lockPassed ? 'passed' : 'failed'}
              </div>
              <div
                className="tether-attempts result-attempts"
                aria-label="Signal Lock attempts"
              >
                {[0, 1, 2].map((index) => {
                  const hit = countedLockHits[index];
                  return (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className={
                        hit === 'Miss'
                          ? 'miss'
                          : hit === 'Good' || hit === 'Perfect'
                            ? 'pass'
                            : 'open'
                      }
                    />
                  );
                })}
              </div>
              <p className="eyebrow">
                {e.newSlot
                  ? 'NEW STARBOOK ENTRY'
                  : e.duplicate
                    ? 'A SECOND PRINTING'
                    : 'NEW CARD'}
              </p>
              <h2 className="result-label">
                {granted ? granted.name : species.name}
              </h2>
              <p>
                {granted
                  ? `${granted.subtitle ? granted.subtitle + ' · ' : ''}${label(granted.rarity)} · ${cardCounter(granted)}`
                  : `${label(species.rarityBase)} · ${label(species.core)} Core · ${species.zone}`}
              </p>
              <div className="reward-line">
                <Sparkles size={16} /> +{e.reward} Stardust{' '}
                {e.shardReward > 0 && (
                  <>
                    <Gem size={16} /> +{e.shardReward} Shards
                  </>
                )}
                {e.sparkReward > 0 && (
                  <>
                    <Zap size={16} /> +{e.sparkReward} Spark
                  </>
                )}
              </div>
              {e.duplicate && (
                <small>
                  You already held this printing. Duplicates mint shards.
                </small>
              )}
              <div className="result-actions">
                <button
                  className="primary"
                  onClick={() => update((s) => scan(dismissResult(s)))}
                >
                  Scan again <ArrowUpRight size={18} />
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    update(dismissResult);
                    setTab('book');
                  }}
                >
                  View Starbook
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <aside>
        <article className="panel">
          <p className="eyebrow">YOUR EXPEDITION</p>
          <h2>
            {discovered === SET_COUNT
              ? 'First discoveries, complete.'
              : 'A world to discover.'}
          </h2>
          <p>
            {intro
              ? 'Start with three free contacts. Each one adds a Starlet, Stardust, and a Spark to your reserve.'
              : 'Every flip grants a card. Accuracy decides which printing.'}
          </p>
          <div className="metric">
            {String(discovered).padStart(2, '0')}{' '}
            <span>/ {String(SET_COUNT).padStart(2, '0')} discovered</span>
          </div>
          <Progress
            value={(discovered / SET_COUNT) * 100}
            aria-label="Starbook completion"
          />
          <div className="zone-line">
            <span>Home</span>
            <span>Lunara</span>
          </div>
          <button className="text-button" onClick={() => setTab('book')}>
            Open Starbook ↗
          </button>
        </article>
        <article className="panel note">
          <Sparkles size={22} />
          <h3>
            {e?.stage === 'lock' ? 'Read the orbit.' : 'Every flip pays.'}
          </h3>
          {e?.stage === 'lock' ? (
            <>
              <p>
                Land one tether in green to pass. Yellow is a free retry;
                outside yellow spends an attempt.
              </p>
              <p>
                You always come away with a card. Accuracy decides which of this
                Starlet&apos;s printings you get.
              </p>
              <button className="text-button" onClick={() => setSettings(true)}>
                Adjust timing
              </button>
            </>
          ) : (
            <p>
              Every flip grants a card. A clean run reaches the better
              printings; a poor one still pays out on that Starlet&apos;s own
              line.
            </p>
          )}
        </article>
      </aside>
    </section>
  );
}
