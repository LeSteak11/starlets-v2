'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Radar,
  BookOpen,
  Zap,
  Sparkles,
  ArrowUpRight,
  Settings2,
  Crosshair,
  Check,
  Leaf,
  Waves,
  Flame,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { BALANCE as B, SPECIES, label } from '@/lib/balance';
import {
  newSave,
  parseSave,
  migrateLegacySave,
  LEGACY_SAVE_KEY,
  regenerate,
  scan,
  beginEncounter,
  tether,
  dismissResult,
  SAVE_KEY,
} from '@/lib/game';
import type { Save, Encounter } from '@/lib/game';
const CORE_ICONS = { grove: Leaf, tide: Waves, flare: Flame };

function SignalOrbit({
  encounter,
  slow,
  paused,
  onTether,
}: {
  encounter: Encounter;
  slow: boolean;
  paused: boolean;
  onTether: (angle: number) => void;
}) {
  const species = SPECIES.find((s) => s.id === encounter.speciesId)!;
  const dot = useRef<SVGCircleElement>(null);
  const angle = useRef(encounter.phase);
  const lastFrame = useRef<number | null>(null);
  const lastShot = useRef(0);
  const [cooldown, setCooldown] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let frame = 0;
    const animate = (time: number) => {
      if (lastFrame.current !== null && !paused && !document.hidden)
        angle.current =
          (angle.current +
            (Math.min(time - lastFrame.current, 50) /
              (slow ? B.capture.slowOrbitMs : B.capture.orbitMs)) *
              360 *
              species.speed) %
          360;
      lastFrame.current = time;
      const rad = (angle.current * Math.PI) / 180;
      dot.current?.setAttribute('cx', String(150 + 134 * Math.sin(rad)));
      dot.current?.setAttribute('cy', String(150 - 134 * Math.cos(rad)));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      lastFrame.current = null;
    };
  }, [slow, paused, species.speed]);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  const fire = () => {
    const now = performance.now();
    if (
      paused ||
      document.hidden ||
      now - lastShot.current < B.capture.cooldownMs
    )
      return;
    lastShot.current = now;
    setCooldown(true);
    onTether(angle.current);
    timeout.current = setTimeout(
      () => setCooldown(false),
      B.capture.cooldownMs,
    );
  };
  const arc = (half: number) => `${((2 * half) / 360) * 842} 842`;
  return (
    <>
      <div className="art-orbit">
        <Image
          unoptimized
          width={1024}
          height={1024}
          src={species.catchSprite}
          alt={species.name}
        />
        <svg className="orbit-svg" viewBox="0 0 300 300" aria-hidden="true">
          <circle
            cx="150"
            cy="150"
            r="134"
            fill="none"
            stroke="#4e657b"
            strokeWidth="2"
          />
          <g transform={`rotate(${encounter.target - 90},150,150)`}>
            <circle
              cx="150"
              cy="150"
              r="134"
              fill="none"
              stroke="#639560"
              strokeWidth="12"
              strokeDasharray={arc(B.capture.goodWindow)}
              transform={`rotate(${-B.capture.goodWindow},150,150)`}
            />
            <circle
              cx="150"
              cy="150"
              r="134"
              fill="none"
              stroke="#d4ffae"
              strokeWidth="12"
              strokeDasharray={arc(B.capture.perfectWindow)}
              transform={`rotate(${-B.capture.perfectWindow},150,150)`}
            />
          </g>
          <circle
            ref={dot}
            cx="150"
            cy="16"
            r="7"
            fill="white"
            stroke="#121e30"
            strokeWidth="3"
          />
        </svg>
      </div>
      <div className="capture-controls">
        <div className="meter-row">
          <span>Signal stability</span>
          <span>
            {Math.round((encounter.meter / B.capture.threshold) * 100)}%
          </span>
        </div>
        <Progress
          className="capture-progress"
          value={(encounter.meter / B.capture.threshold) * 100}
          aria-label="Catch meter"
        />
        <p className="quality" aria-live="polite">
          {encounter.hits.length
            ? `${encounter.hits.at(-1)} · ${B.capture.tethers - encounter.hits.length} tethers left`
            : '4 tethers. Make each one count.'}
        </p>
        <button
          className="primary"
          disabled={paused || cooldown}
          onClick={fire}
        >
          <Crosshair size={19} />
          {cooldown ? 'Recharging tether…' : 'Fire tether'}
        </button>
        <p>
          Tap when the white tracer enters the green zone.
          <br />
          The bright center gives a Perfect lock.
        </p>
        {encounter.guaranteed && (
          <small>
            {encounter.intro
              ? 'First contact assistance · Catch guaranteed'
              : 'Full Familiarity · Catch guaranteed'}
          </small>
        )}
      </div>
    </>
  );
}

export default function Home() {
  const [save, setSave] = useState<Save | null>(null);
  const current = useRef<Save | null>(null);
  const [tab, setTab] = useState<'scan' | 'book'>('scan');
  const [settings, setSettings] = useState(false);
  const [reset, setReset] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  useEffect(() => {
    const initialize = setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        // Phase 1 playtest saves are migrated forward, never discarded. The
        // legacy key is left in place as a fallback until Phase 2 ships.
        const legacy = raw ? null : localStorage.getItem(LEGACY_SAVE_KEY);
        const loaded = regenerate(
          raw ? parseSave(raw) : legacy ? migrateLegacySave(legacy) : newSave(),
        );
        localStorage.setItem(SAVE_KEY, JSON.stringify(loaded));
        current.current = loaded;
        setSave(loaded);
      } catch {
        setError(
          'Your local save could not be loaded. Enable browser storage or reset the save in Settings to start again. Existing data has been preserved.',
        );
      }
      setNow(Date.now());
    }, 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sync = (event: StorageEvent) => {
      if (event.key !== SAVE_KEY) return;
      try {
        const s = event.newValue ? parseSave(event.newValue) : newSave();
        current.current = s;
        setSave(s);
      } catch {
        setError(
          'Another tab changed the save to an unreadable format. Reload or reset in Settings.',
        );
      }
    };
    window.addEventListener('storage', sync);
    return () => {
      clearTimeout(initialize);
      clearInterval(timer);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const update = useCallback((operation: (state: Save) => Save) => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const previous = raw ? parseSave(raw) : current.current;
      if (!previous) return;
      const next = operation(previous);
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      current.current = next;
      setSave(next);
      setError('');
    } catch {
      setError(
        'Progress could not be saved. Check browser storage, then retry. This action has not been applied.',
      );
    }
  }, []);
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
  }, []);
  const state = save ? regenerate(save, now) : null;
  const e = state?.encounter;
  const species = e ? SPECIES.find((s) => s.id === e.speciesId)! : null;
  const selected = detail ? SPECIES.find((s) => s.id === detail) : null;
  const discovered = state
    ? SPECIES.filter((s) => state.records[s.id].caught > 0).length
    : 0;
  const intro = (state?.introStep ?? 0) < 3;
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
    try {
      const s = newSave();
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      current.current = s;
      setSave(s);
      setError('');
      setReset(false);
      setSettings(false);
      setDetail(null);
      setTab('scan');
    } catch {
      setError(
        'Browser storage is unavailable. Enable it before starting a new save.',
      );
    }
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
            ? `${discovered} / 3 discovered`
            : e?.stage === 'lock'
              ? 'Signal Lock active'
              : 'Scanner online'}
        </span>
      </section>
      {tab === 'scan' ? (
        <section className="scanner-layout">
          <div className="scanner-stage">
            <div className="coordinates">
              LN—{species?.number ?? '000'}
              <span>
                {e?.stage === 'lock'
                  ? 'TETHER ARRAY / ACTIVE'
                  : 'LIVE FREQUENCY'}
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
                      ? `FIRST CONTACT / ${(state?.introStep ?? 0) + 1} OF 3`
                      : 'LUNARA SIGNAL NETWORK'}
                  </span>
                  <h2>
                    {intro
                      ? 'Your next discovery awaits'
                      : 'Find your next connection'}
                  </h2>
                  <p>
                    {intro
                      ? 'Three signals. Three new entries in your Starbook.'
                      : 'Trace a mystery signal from one of Lunara’s habitats.'}
                  </p>
                  <button
                    className="primary"
                    disabled={!state}
                    onClick={startScan}
                  >
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
                paused={settings || reset}
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
                  {!e.caught &&
                    state?.records[species.id].familiarity === 100 && (
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
                {discovered === 3
                  ? 'First discoveries, complete.'
                  : 'A world to discover.'}
              </h2>
              <p>
                {intro
                  ? 'Start with three free contacts. Each catch adds a Starlet, Stardust, and a Spark to your reserve.'
                  : 'Return to familiar signals to gather Stardust and record more catches.'}
              </p>
              <div className="metric">
                0{discovered} <span>/ 03 discovered</span>
              </div>
              <Progress
                value={(discovered / 3) * 100}
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
                {e?.stage === 'lock'
                  ? 'Read the orbit.'
                  : 'Every signal counts.'}
              </h3>
              {e?.stage === 'lock' ? (
                <>
                  <p>
                    Four tethers to reach 100%. Bright green is Perfect. The
                    target shifts after every shot.
                  </p>
                  <p>
                    Signal strength varies slightly. Accuracy gives you the
                    edge.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setSettings(true)}
                  >
                    Adjust timing
                  </button>
                </>
              ) : (
                <p>
                  A missed catch earns 25 Familiarity. At 100, the next
                  encounter with that species is guaranteed.
                </p>
              )}
            </article>
          </aside>
        </section>
      ) : (
        <>
          <div className="collection-grid">
            {SPECIES.map((sp) => {
              const record = state?.records[sp.id];
              const caught = !!record?.caught;
              const known = caught || (record?.familiarity ?? 0) > 0;
              const Icon = CORE_ICONS[sp.core];
              return (
                <button
                  key={sp.id}
                  className="creature-card"
                  disabled={!state}
                  onClick={() => setDetail(sp.id)}
                  aria-label={`View ${known ? sp.name : 'unknown Starlet ' + sp.number}`}
                >
                  <div className="card-head">
                    <span>LN / {sp.number}</span>
                    <span className="badge">
                      {known ? label(sp.rarityBase) : 'UNDISCOVERED'}
                    </span>
                  </div>
                  <div className={`card-art ${caught ? '' : 'unseen'}`}>
                    <Image
                      unoptimized
                      width={1024}
                      height={1024}
                      src={sp.catchSprite}
                      alt={caught ? sp.name : 'Uncaught silhouette'}
                    />
                  </div>
                  <h2>{known ? sp.name : 'Unknown signal'}</h2>
                  <p>
                    {caught
                      ? sp.zone
                      : `${record?.familiarity ?? 0}/100 Familiarity`}
                  </p>
                  <div className="card-foot">
                    <span style={{ color: known ? sp.color : undefined }}>
                      {known ? (
                        <>
                          <Icon
                            size={14}
                            style={{
                              display: 'inline',
                              verticalAlign: 'middle',
                            }}
                          />{' '}
                          {label(sp.core)} Core
                        </>
                      ) : (
                        'Lunara'
                      )}
                    </span>
                    <span>
                      {caught ? (
                        <>
                          <Check size={14} style={{ display: 'inline' }} />{' '}
                          Caught ×{record?.caught}
                        </>
                      ) : (
                        'Awaiting contact'
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="save-note">
            Saved on this browser · Phase 1 field collection
          </p>
        </>
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
          Starbook <span>{discovered}/3</span>
        </button>
      </nav>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="game-dialog">
          <DialogTitle>Field settings</DialogTitle>
          <DialogDescription>
            Your expedition is saved on this browser. No account required.
          </DialogDescription>
          <label className="setting-row" htmlFor="slow-timing">
            <Switch
              id="slow-timing"
              checked={state?.slowTiming ?? false}
              disabled={!state || e?.stage === 'lock'}
              onCheckedChange={(checked) =>
                update((s) => ({ ...s, slowTiming: checked }))
              }
            />
            <span>
              Slower Signal Lock
              <small>
                {e?.stage === 'lock'
                  ? 'Change between encounters.'
                  : 'More time to aim. Same rewards.'}
              </small>
            </span>
          </label>
          <p className="dialog-copy">
            Sparks regenerate every 90 minutes up to {B.sparks.cap}. Intro
            rewards can exceed that cap; you keep the overflow.
          </p>
          <p className="dialog-copy">
            Stardust: {state?.stardust ?? 0}. Training and spending arrive in a
            later phase.
          </p>
          <button
            className="secondary danger"
            onClick={() => {
              setSettings(false);
              setReset(true);
            }}
          >
            Reset local save
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={reset} onOpenChange={setReset}>
        <AlertDialogContent>
          <AlertDialogTitle>Start a new expedition?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your Starbook, Sparks, and encounter
            progress from this browser.
          </AlertDialogDescription>
          <AlertDialogCancel>Keep my progress</AlertDialogCancel>
          <AlertDialogAction onClick={freshStart}>
            Delete and restart
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="game-dialog">
          {selected &&
            state &&
            (() => {
              const r = state.records[selected.id];
              const known = r.caught > 0 || r.familiarity > 0;
              return (
                <>
                  <DialogTitle>
                    {known ? selected.name : 'Unknown signal'}{' '}
                    <span className="badge">LN / {selected.number}</span>
                  </DialogTitle>
                  <DialogDescription>
                    {known
                      ? `${label(selected.rarityBase)} · ${label(selected.core)} Core · Home: Lunara`
                      : 'A creature waiting to be discovered on Lunara.'}
                  </DialogDescription>
                  <div className={r.caught ? '' : 'unseen'}>
                    <Image
                      unoptimized
                      width={1024}
                      height={1024}
                      className="detail-art"
                      src={selected.catchSprite}
                      alt={r.caught ? selected.name : 'Uncaught silhouette'}
                    />
                  </div>
                  <p className="dialog-copy">
                    {r.caught
                      ? selected.lore
                      : 'Follow its signal from the Scanner. Failed encounters build Familiarity toward a guaranteed catch.'}
                  </p>
                  <div className="detail-grid">
                    <div>
                      <small>Times caught</small>
                      {r.caught}
                    </div>
                    <div>
                      <small>Familiarity</small>
                      {r.familiarity}/100
                    </div>
                    {r.caught > 0 && (
                      <div>
                        <small>Species Stardust</small>
                        {r.speciesDust}
                      </div>
                    )}
                  </div>
                  {r.caught > 0 && (
                    <>
                      <p className="dialog-copy">
                        Base card · {label(selected.core)} Core
                        <br />
                        Signature: {selected.signatureName}
                        <br />
                        First contact:{' '}
                        {new Date(r.firstCaught!).toLocaleDateString()}
                      </p>
                      <small>
                        Alternate printings, packs, and the binder arrive in
                        later phases.
                      </small>
                    </>
                  )}
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </main>
  );
}
