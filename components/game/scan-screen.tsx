'use client';
import Image from 'next/image';
import { ArrowUpRight, Crosshair, Radar, Sparkles, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SignalOrbit } from '@/components/game/signal-orbit';
import { BALANCE as B, INTRO_SPECIES, SPECIES, label } from '@/lib/balance';
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
                  ? 'Introductory encounters are free · +1 Spark per catch'
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
                    : '4 tethers · Accuracy strengthens the connection'}
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
            onTether={(angle) => update((s) => tether(s, angle))}
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
              <p className="eyebrow">
                {e.caught
                  ? e.wasNew
                    ? 'NEW STARBOOK ENTRY'
                    : 'FAMILIAR SIGNAL RECONNECTED'
                  : 'CONNECTION FADED'}
              </p>
              <h2 className="result-label">
                {e.caught ? species.name : 'Closer next time.'}
              </h2>
              <p>
                {e.caught
                  ? `${label(species.rarityBase)} · ${label(species.core)} Core · ${species.zone}`
                  : `${species.name} slipped away. You learned its signal.`}
              </p>
              <div className="reward-line">
                {e.caught ? (
                  <>
                    <Sparkles size={16} /> +{e.reward} Stardust{' '}
                    {e.sparkReward > 0 && (
                      <>
                        <Zap size={16} /> +{e.sparkReward} Spark
                      </>
                    )}
                  </>
                ) : (
                  <>
                    +{B.familiarity.failure} Familiarity ·{' '}
                    {state?.records[species.id].familiarity}/100
                  </>
                )}
              </div>
              {!e.caught && state?.records[species.id].familiarity === 100 && (
                <small>
                  Your next encounter with {species.name} is guaranteed.
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
              ? 'Start with three free contacts. Each catch adds a Starlet, Stardust, and a Spark to your reserve.'
              : 'Return to familiar signals to gather Stardust and record more catches.'}
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
            {e?.stage === 'lock' ? 'Read the orbit.' : 'Every signal counts.'}
          </h3>
          {e?.stage === 'lock' ? (
            <>
              <p>
                Four tethers to reach 100%. Bright green is Perfect. The target
                shifts after every shot.
              </p>
              <p>
                Signal strength varies slightly. Accuracy gives you the edge.
              </p>
              <button className="text-button" onClick={() => setSettings(true)}>
                Adjust timing
              </button>
            </>
          ) : (
            <p>
              A missed catch earns 25 Familiarity. At 100, the next encounter
              with that species is guaranteed.
            </p>
          )}
        </article>
      </aside>
    </section>
  );
}
