'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Crosshair, Flame, Leaf, Waves } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { BALANCE as B, SPECIES } from '@/lib/balance';
import type { Encounter } from '@/lib/game';
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
        {encounter.intro && (
          <small>
            First contact · This Starlet&apos;s base card is guaranteed
          </small>
        )}
      </div>
    </>
  );
}
