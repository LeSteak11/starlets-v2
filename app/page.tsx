'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Radar, Settings2, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { GameDialogs } from '@/components/game/dialogs';
import { ScanScreen } from '@/components/game/scan-screen';
import { StarbookScreen } from '@/components/game/starbook-screen';
import { useSave } from '@/app/_hooks/use-save';
import { BALANCE as B, INTRO_SPECIES, SPECIES, label } from '@/lib/balance';
import { regenerate, scan } from '@/lib/game';
const SET_COUNT = SPECIES.length;
export default function Home() {
  const { save, current, error, now, update, restart } = useSave();
  const [tab, setTab] = useState<'scan' | 'book'>('scan');
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
  const state = save ? regenerate(save, now) : null;
  const e = state?.encounter;
  const species = e
    ? (SPECIES.find((s) => s.id === e.speciesId) ?? null)
    : null;
  const selected = detail ? SPECIES.find((s) => s.id === detail) : null;
  const discovered = state
    ? SPECIES.filter((s) => state.records[s.id].caught > 0).length
    : 0;
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
          ✦ STARLETS<span>FIELD OBSERVATORY</span>
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
        <p className="message" role="alert">
          {error}
        </p>
      )}
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            LUNARA /{' '}
            {tab === 'book'
              ? 'FIELD ARCHIVE'
              : species && e?.stage !== 'signal'
                ? species.zone.toUpperCase()
                : 'DEEP SPACE SCANNER'}
          </p>
          <h1>
            {tab === 'book'
              ? 'Your discoveries.'
              : e?.stage === 'lock'
                ? 'Establish a connection.'
                : e?.stage === 'result'
                  ? e.caught
                    ? 'A signal. A connection.'
                    : 'Not lost. Just learning.'
                  : 'Follow the signal.'}
          </h1>
          <p>
            {tab === 'book'
              ? 'Every encounter leaves a trace.'
              : 'Something out there is waiting to be discovered.'}
          </p>
        </div>
        <span className="status">
          ●{' '}
          {tab === 'book'
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
      ) : (
        <StarbookScreen state={state} setDetail={setDetail} />
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
          className={tab === 'book' ? 'active' : ''}
          aria-current={tab === 'book' ? 'page' : undefined}
          onClick={() => setTab('book')}
        >
          <BookOpen />
          Starbook{' '}
          <span>
            {discovered}/{SET_COUNT}
          </span>
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
