'use client';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { CORE_ICONS } from '@/components/game/signal-orbit';
import { SPECIES, label } from '@/lib/balance';
import type { Save } from '@/lib/game';
export function StarbookScreen({
  state,
  setDetail,
}: {
  state: Save | null;
  setDetail: (speciesId: string) => void;
}) {
  return (
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
                      <Check size={14} style={{ display: 'inline' }} /> Caught ×
                      {record?.caught}
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
  );
}
