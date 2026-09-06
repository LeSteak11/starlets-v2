'use client';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  PackageOpen,
  Radar,
  Settings2,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { BinderScreen } from '@/components/game/binder-screen';
import { GameDialogs } from '@/components/game/dialogs';
import { PacksScreen } from '@/components/game/packs-screen';
import { ScanScreen } from '@/components/game/scan-screen';
import { ExpeditionScreen } from '@/components/game/expedition-screen';
import { useSave } from '@/app/_hooks/use-save';
import { BALANCE as B, INTRO_SPECIES, SPECIES, label } from '@/lib/balance';
import { CATALOGUE } from '@/lib/catalogue';
import { track } from '@/lib/analytics';
import { accruePacks, regenerate, scan } from '@/lib/game';
const SET_COUNT = SPECIES.length;
export default function Home() {
  const { save, current, error, now, update, restart } = useSave();
  const [tab, setTab] = useState<'scan' | 'book' | 'packs' | 'expedition'>(
    'scan',
  );
  const [settings, setSettings] = useState(false);
  const [reset, setReset] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  useEffect(() => {
    type ToolContext = {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: () => unknown;
        },
        options: { signal: AbortSignal },
      ) => unknown;
    };
    const context = (document as Document & { modelContext?: ToolContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_starbook',
            description:
              'Read current local Starbook discoveries and encounter status without changing progress.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: () => {
              const s = current.current;
              return s
                ? {
                    discovered: SPECIES.filter(
                      (sp) => s.records[sp.id].caught > 0,
                    ).map((sp) => ({
                      name: sp.name,
                      rarity: label(sp.rarityBase),
                      catches: s.records[sp.id].caught,
                    })),
                    sparks: regenerate(s).sparks,
                    encounter: s.encounter?.stage ?? null,
                  }
                : { error: 'Save unavailable' };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional API; game remains fully usable. */
    }
    return () => lifecycle.abort();
  }, [current]);
  const started = useRef(false);
  useEffect(() => {
    if (!save || started.current) return;
    started.current = true;
    track({
      name: 'session_start',
      discovered: SPECIES.filter((s) => save.records[s.id].caught > 0).length,
      owned: Object.keys(save.owned).length,
      packsStored: save.packs.stored,
    });
  }, [save]);
  const state = save ? accruePacks(regenerate(save, now), now) : null;
  const e = state?.encounter;
  const species = e
    ? (SPECIES.find((s) => s.id === e.speciesId) ?? null)
    : null;
  const selected = detail ? SPECIES.find((s) => s.id === detail) : null;
  const discovered = state
    ? SPECIES.filter((s) => state.records[s.id].caught > 0).length
    : 0;
  const held = state ? Object.keys(state.owned).length : 0;
  const intro = (state?.introStep ?? 0) < INTRO_SPECIES.length;
  const countdown =
    state && state.sparks < B.sparks.cap
      ? Math.max(
          1,
          Math.ceil(
            (B.sparks.regenerationMs - (now - state.regeneratedAt)) / 60000,
          ),
        )
      : 0;
  const startScan = () => {
    setTab('scan');
    update((s) => scan(s));
  };
  const freshStart = () => {
    if (!restart()) return;
    setReset(false);
    setSettings(false);
    setDetail(null);
    setTab('scan');
  };
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Starlets home">
          ✦ STARLETS<span>HOME</span>
        </Link>
        <div className="resources">
          <span
            title={
              countdown
                ? `Next Spark in ${countdown} minutes`
                : 'Spark reserve full'
            }
          >
            <Zap size={17} />
            {state?.sparks ?? '—'}
            <span className="resource-label"> Sparks</span>
          </span>
          <span title="Earned Stardust">
            <Sparkles size={17} />
            {state?.stardust ?? 0}
          </span>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      {error && (
        <div className="message save-recovery" role="alert">
          <span>{error}</span>
          {!save && (
            <button onClick={freshStart}>Start a recovered save</button>
          )}
        </div>
      )}
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            LUNARA /{' '}
            {tab === 'packs'
              ? 'SUPPLY DROP'
              : tab === 'expedition'
                ? 'HOME / EXPEDITIONS'
                : tab === 'book'
                  ? 'FIELD ARCHIVE'
                  : species && e?.stage !== 'signal'
                    ? species.zone.toUpperCase()
                    : 'DEEP SPACE SCANNER'}
          </p>
          <h1>
            {tab === 'packs'
              ? 'Open the next signal.'
              : tab === 'expedition'
                ? 'Prepare the right team.'
                : tab === 'book'
                  ? 'Your discoveries.'
                  : e?.stage === 'lock'
                    ? 'Establish a connection.'
                    : e?.stage === 'result'
                      ? e.newSlot
                        ? 'A signal. A connection.'
                        : 'Another printing.'
                      : 'Follow the signal.'}
          </h1>
          <p>
            {tab === 'packs'
              ? 'Five printings. One card at a time.'
              : tab === 'expedition'
                ? 'A different card can change what a Starlet brings.'
                : tab === 'book'
                  ? 'Every encounter leaves a trace.'
                  : 'Something out there is waiting to be discovered.'}
          </p>
        </div>
        <span className="status">
          ●{' '}
          {tab === 'packs'
            ? state && state.packs.stored > 0
              ? `${state.packs.stored} pack${state.packs.stored === 1 ? '' : 's'} ready`
              : 'Supply timer active'
            : tab === 'expedition'
              ? state?.expedition.startedAt
                ? now >= state.expedition.completesAt!
                  ? 'Reward ready'
                  : 'Team away'
                : 'Assignment ready'
              : tab === 'book'
                ? `${discovered} / ${SET_COUNT} discovered`
                : e?.stage === 'lock'
                  ? 'Signal Lock active'
                  : 'Scanner online'}
        </span>
      </section>
      {tab === 'scan' ? (
        <ScanScreen
          state={state}
          e={e}
          species={species}
          intro={intro}
          countdown={countdown}
          discovered={discovered}
          paused={settings || reset}
          update={update}
          startScan={startScan}
          setTab={setTab}
          setSettings={setSettings}
        />
      ) : tab === 'packs' ? (
        <PacksScreen state={state} now={now} update={update} />
      ) : tab === 'expedition' && state ? (
        <ExpeditionScreen state={state} now={now} update={update} />
      ) : (
        <BinderScreen
          state={state}
          onOpenCard={(cardId) =>
            setDetail(CATALOGUE.get(cardId)?.speciesId ?? null)
          }
        />
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          className={tab === 'scan' ? 'active' : ''}
          aria-current={tab === 'scan' ? 'page' : undefined}
          onClick={() => setTab('scan')}
        >
          <Radar />
          Scan{e?.stage === 'lock' && ' · Active'}
        </button>
        <button
          className={tab === 'expedition' ? 'active' : ''}
          aria-current={tab === 'expedition' ? 'page' : undefined}
          onClick={() => setTab('expedition')}
        >
          <Compass />
          Expeditions
          {state?.expedition.startedAt && now >= state.expedition.completesAt!
            ? ' · Ready'
            : ''}
        </button>
        <button
          className={tab === 'book' ? 'active' : ''}
          aria-current={tab === 'book' ? 'page' : undefined}
          onClick={() => setTab('book')}
        >
          <BookOpen />
          Binder{' '}
          <span>
            {held}/{CATALOGUE.all.length}
          </span>
        </button>
        <button
          className={tab === 'packs' ? 'active' : ''}
          aria-current={tab === 'packs' ? 'page' : undefined}
          onClick={() => setTab('packs')}
        >
          <PackageOpen />
          Packs{state && state.packs.stored > 0 && ` · ${state.packs.stored}`}
        </button>
      </nav>
      <GameDialogs
        state={state}
        e={e}
        selected={selected}
        settings={settings}
        setSettings={setSettings}
        reset={reset}
        setReset={setReset}
        setDetail={setDetail}
        update={update}
        freshStart={freshStart}
      />
    </main>
  );
}
