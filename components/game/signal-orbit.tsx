'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Crosshair, Flame, Leaf, Star, Waves } from 'lucide-react';
import { BALANCE as B, SPECIES } from '@/lib/balance';
import { spentTetherAttempts, type Encounter } from '@/lib/game';
export const CORE_ICONS = { grove: Leaf, tide: Waves, flare: Flame };
export function SignalOrbit({
  encounter,
  slow,
  paused,
  onTether,
}: {
  encounter: Encounter;
  slow: boolean;
  paused: boolean;
  onTether: (angle: number, targetAngle: number) => void;
}) {
  const species = SPECIES.find((s) => s.id === encounter.speciesId)!;
  const dot = useRef<SVGCircleElement>(null);
  const target = useRef<SVGGElement>(null);
  const angle = useRef(encounter.phase);
  const targetAngle = useRef(encounter.target);
  const lastFrame = useRef<number | null>(null);
  const attemptPending = useRef(false);
  const lastInputAt = useRef(Number.NEGATIVE_INFINITY);
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    const suspend = () => setFocused(false);
    const resume = () => setFocused(true);
    const syncVisibility = () => {
      lastFrame.current = null;
      setFocused(!document.hidden);
    };
    window.addEventListener('blur', suspend);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      window.removeEventListener('blur', suspend);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);
  useEffect(() => {
    attemptPending.current = false;
  }, [encounter.hits.length]);
  useEffect(() => {
    let frame = 0;
    const animate = (time: number) => {
      if (
        lastFrame.current !== null &&
        !paused &&
        focused &&
        !document.hidden
      ) {
        const elapsed = Math.min(time - lastFrame.current, 50);
        angle.current =
          (angle.current +
            (elapsed / (slow ? B.capture.slowOrbitMs : B.capture.orbitMs)) *
              360) %
          360;
        targetAngle.current =
          (targetAngle.current +
            (elapsed /
              (slow ? B.capture.slowTargetOrbitMs : B.capture.targetOrbitMs)) *
              360) %
          360;
      }
      lastFrame.current = time;
      const rad = (angle.current * Math.PI) / 180;
      dot.current?.setAttribute('cx', String(150 + 134 * Math.sin(rad)));
      dot.current?.setAttribute('cy', String(150 - 134 * Math.cos(rad)));
      target.current?.setAttribute(
        'transform',
        `rotate(${targetAngle.current - 90},150,150)`,
      );
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      lastFrame.current = null;
    };
  }, [slow, paused, focused]);
  const fire = () => {
    const inputAt = performance.now();
    if (
      paused ||
      !focused ||
      document.hidden ||
      attemptPending.current ||
      inputAt - lastInputAt.current < B.capture.inputGuardMs
    )
      return;
    // This synchronous latch absorbs the click synthesized after a touch and
    // accidental double events. The next render opens the next attempt.
    attemptPending.current = true;
    lastInputAt.current = inputAt;
    onTether(angle.current, targetAngle.current);
  };
  const perfectWindow = slow
    ? B.capture.slowPerfectWindow
    : B.capture.perfectWindow;
  const goodWindow = slow ? B.capture.slowGoodWindow : B.capture.goodWindow;
  const arc = (half: number) => `${((2 * half) / 360) * 842} 842`;
  const latest = encounter.hits.at(-1);
  const misses = spentTetherAttempts(encounter.hits);
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
          <g ref={target}>
            <circle
              cx="150"
              cy="150"
              r="134"
              fill="none"
              stroke="#639560"
              strokeWidth="12"
              strokeDasharray={arc(goodWindow)}
              transform={`rotate(${-goodWindow},150,150)`}
            />
            <circle
              cx="150"
              cy="150"
              r="134"
              fill="none"
              stroke="#d4ffae"
              strokeWidth="12"
              strokeDasharray={arc(perfectWindow)}
              transform={`rotate(${-perfectWindow},150,150)`}
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
        <div
          className="tether-attempts"
          aria-label={`${misses} of 3 attempts missed`}
        >
          {Array.from({ length: B.capture.tethers }, (_, index) => (
            <Star
              key={index}
              className={index < misses ? 'miss' : 'open'}
              aria-label={
                index < misses
                  ? `Attempt ${index + 1} missed`
                  : `Attempt ${index + 1} available`
              }
            />
          ))}
        </div>
        <p
          className={`quality ${latest ? `quality-${latest.toLowerCase().replace(' ', '-')}` : ''}`}
          aria-live="polite"
        >
          {latest
            ? latest === 'Near Miss'
              ? 'Near Miss · Free retry'
              : latest === 'Miss'
                ? `Miss · ${B.capture.tethers - misses} attempt${B.capture.tethers - misses === 1 ? '' : 's'} left`
                : `${latest} · Signal Lock passed`
            : 'Three attempts to land inside green.'}
        </p>
        <button
          className="primary tether-button"
          disabled={paused || !focused}
          onClick={fire}
        >
          <Crosshair size={19} />
          Fire tether
        </button>
        <p>
          Tap when the white tracer enters the green zone.
          <br />
          Yellow is a free Near Miss retry.
        </p>
        {encounter.intro && (
          <small>
            First contact · This Starlet&apos;s base card is guaranteed
          </small>
        )}
      </div>
    </>
  );
}
