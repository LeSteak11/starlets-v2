'use client';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BALANCE as B, SPECIES, label } from '@/lib/balance';
import { CATALOGUE } from '@/lib/catalogue';
import type { Encounter, Save } from '@/lib/game';
type Species = (typeof SPECIES)[number];
export function GameDialogs({
  state,
  e,
  selected,
  settings,
  setSettings,
  reset,
  setReset,
  setDetail,
  update,
  freshStart,
}: {
  state: Save | null;
  e: Encounter | null | undefined;
  selected: Species | null | undefined;
  settings: boolean;
  setSettings: (open: boolean) => void;
  reset: boolean;
  setReset: (open: boolean) => void;
  setDetail: (speciesId: string | null) => void;
  update: (operation: (s: Save) => Save) => void;
  freshStart: () => void;
}) {
  return (
    <>
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
              const line = CATALOGUE.lineFor(selected.id);
              const held = line.filter((c) => state.owned[c.cardId]);
              // The slot is filled the moment any card of this species lands.
              const known = r.caught > 0;
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
                      : 'Follow its signal from the Scanner, or open a pack. Every flip grants a card.'}
                  </p>
                  <div className="detail-grid">
                    <div>
                      <small>Times caught</small>
                      {r.caught}
                    </div>
                    <div>
                      <small>Cards held</small>
                      {held.length}/{line.length}
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
    </>
  );
}
