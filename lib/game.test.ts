import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE as B, INTRO_SPECIES, SPECIES } from './balance.ts';
import { BINDER_PAGES, SET_01, baseCardFor, cardNumber } from './cards.ts';
import {
  newSave,
  scan,
  beginEncounter,
  tether,
  dismissResult,
  regenerate,
  parseSave,
  qualityAt,
  weightedSpecies,
} from './game.ts';
import type { Save } from './game.ts';
const rng = () => 0.5;
function finish(s: Save, perfect = false) {
  while (s.encounter?.stage === 'lock')
    s = tether(s, (s.encounter.target + (perfect ? 0 : 180)) % 360, 1000);
  return s;
}
function normal() {
  return { ...newSave(1000), introStep: 3 };
}
void test('intro is free, guarantees all three catches, and grants bounded rewards once', () => {
  let s = newSave(1000);
  for (let i = 0; i < 3; i++) {
    s = scan(s, rng, 1000);
    assert.equal(s.encounter?.speciesId, SPECIES[i].id);
    s = beginEncounter(s, 1000);
    assert.equal(s.sparks, 6 + i);
    s = finish(s);
    assert.equal(s.encounter?.caught, true);
    assert.equal(s.sparks, 7 + i);
    const settled = s;
    assert.deepEqual(tether(s, 0), settled);
    assert.equal(s.records[SPECIES[i].id].cardIds.length, 1);
    s = dismissResult(s);
  }
  assert.equal(s.stardust, 80);
  assert.equal(s.introStep, 3);
  assert.equal(s.sparks, 9);
  assert.equal(regenerate(s, 1000 + B.sparks.regenerationMs * 10).sparks, 9);
});
void test('scan preview is free, start spends once, and save resumes exact active encounter', () => {
  let s = scan(normal(), rng, 1000);
  assert.equal(s.sparks, 6);
  const preview = s;
  assert.deepEqual(scan(s, rng, 1000), preview);
  s = beginEncounter(s, 1000);
  assert.equal(s.sparks, 5);
  assert.deepEqual(beginEncounter(s, 1000), s);
  s = tether(s, s.encounter!.target, 1000);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
void test('four failures grant 100 Familiarity; next same-species encounter guarantees and resets', () => {
  let s = normal();
  for (let i = 1; i <= 4; i++) {
    s = finish(beginEncounter(scan(s, rng, 1000), 1000));
    assert.equal(s.encounter?.caught, false);
    assert.equal(s.records.novafox.familiarity, i * 25);
    s = dismissResult(s);
  }
  s = beginEncounter(scan(s, rng, 1000), 1000);
  assert.equal(s.encounter?.guaranteed, true);
  s = finish(s);
  assert.equal(s.encounter?.caught, true);
  assert.equal(s.records.novafox.familiarity, 0);
});
void test('accurate timing catches normally; duplicates preserve history and Card ownership', () => {
  let s = finish(beginEncounter(scan(normal(), rng, 1000), 1000), true);
  assert.equal(s.encounter?.caught, true);
  assert.equal(s.records.novafox.xp, 50);
  s = finish(beginEncounter(scan(dismissResult(s), rng, 1000), 1000), true);
  assert.equal(s.records.novafox.caught, 2);
  assert.equal(s.records.novafox.xp, 70);
  assert.equal(s.records.novafox.cardIds.length, 1);
  assert.equal(s.records.novafox.firstCaught, 1000);
  assert.equal(s.stardust, 80);
});
void test('zero Sparks retains mystery signal until regeneration permits encounter', () => {
  let s = scan({ ...normal(), sparks: 0 }, rng, 1000);
  s = beginEncounter(s, 1000);
  assert.equal(s.encounter?.stage, 'signal');
  assert.equal(s.sparks, 0);
  s = beginEncounter(s, 1000 + B.sparks.regenerationMs);
  assert.equal(s.encounter?.stage, 'lock');
  assert.equal(s.sparks, 0);
});
void test('regeneration handles cap, remainder, overflow, and backward clock safely', () => {
  const s = { ...normal(), sparks: 1 };
  const t = B.sparks.regenerationMs;
  const next = regenerate(s, 1000 + 2 * t + 123);
  assert.equal(next.sparks, 3);
  assert.equal(next.regeneratedAt, 1000 + 2 * t);
  assert.equal(regenerate(s, 1000 + 20 * t).sparks, 8);
  assert.equal(regenerate(s, 0).sparks, 1);
  const full = regenerate({ ...s, sparks: 8 }, 1000 + 20 * t);
  const spent = beginEncounter(scan(full, rng, 1000 + 20 * t), 1000 + 20 * t);
  assert.equal(regenerate(spent, 1000 + 20 * t + 1).sparks, 7);
});
void test('quality wraps at zero and respects both timing boundaries', () => {
  assert.equal(qualityAt(359, 1), 'Perfect');
  assert.equal(qualityAt(13, 0), 'Perfect');
  assert.equal(qualityAt(14, 0), 'Good');
  assert.equal(qualityAt(38, 0), 'Good');
  assert.equal(qualityAt(39, 0), 'Miss');
});
void test('invalid saves are rejected without replacing data', () => {
  for (const raw of [
    '{',
    'null',
    '{}',
    JSON.stringify({ ...newSave(), version: 2 }),
    JSON.stringify({ ...newSave(), sparks: -1 }),
    JSON.stringify({ ...newSave(), encounter: {} }),
  ])
    assert.throws(() => parseSave(raw));
});
void test('Set 01 holds its locked shape: 8 Starlets, 28 cards, one base each', () => {
  assert.equal(SPECIES.length, B.set01.species);
  assert.equal(SET_01.length, B.set01.cards);
  assert.equal(INTRO_SPECIES.length, 3);
  // The set boss is never a tutorial catch -- it stays a silhouette for weeks.
  assert.ok(!INTRO_SPECIES.map((s) => s.id as string).includes('selenith'));
  const counted: Record<string, number> = {};
  for (const c of SET_01) counted[c.rarity] = (counted[c.rarity] ?? 0) + 1;
  assert.deepEqual(counted, { ...B.set01.byRarity });
  for (const species of SPECIES) {
    const line = SET_01.filter((c) => c.speciesId === species.id);
    assert.ok(line.length >= 3, species.id);
    assert.equal(line.filter((c) => c.kind === 'base').length, 1, species.id);
    assert.equal(baseCardFor(species.id).speciesId, species.id);
  }
  // Secrets are printings of somebody already in the book, never new species.
  for (const secret of SET_01.filter((c) => c.rarity === 'Secret'))
    assert.ok(SPECIES.some((s) => s.id === secret.speciesId));
  assert.equal(cardNumber(SET_01[0]), 'LUN/01');
  assert.equal(cardNumber(SET_01[27]), 'LUN/28');
  assert.equal(
    BINDER_PAGES.reduce((n, page) => n + page.cards.length, 0),
    SET_01.length,
  );
});
void test('alts may outrank their base, and only 001/002/004 start Common', () => {
  const commonBases = SET_01.filter(
    (c) => c.kind === 'base' && c.rarity === 'Common',
  ).map((c) => c.speciesId);
  assert.deepEqual(commonBases, ['mossbun', 'emberpanda', 'dewlark']);
  const emberpanda = SET_01.filter((c) => c.speciesId === 'emberpanda');
  assert.equal(emberpanda.find((c) => c.kind === 'base')!.rarity, 'Common');
  assert.ok(emberpanda.some((c) => c.rarity === 'Secret'));
  // The set boss has no Common and no Uncommon printing.
  assert.ok(
    !SET_01.filter((c) => c.speciesId === 'selenith').some((c) =>
      ['Common', 'Uncommon'].includes(c.rarity),
    ),
  );
});
void test('scan weights rarity: the mascot is not a routine encounter', () => {
  assert.equal(weightedSpecies(0).id, 'mossbun');
  assert.equal(weightedSpecies(0.999999).id, 'selenith');
  const counts = new Map<string, number>();
  for (let i = 0; i < 10000; i++) {
    const id = weightedSpecies(i / 10000).id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  assert.ok(counts.get('selenith')! < counts.get('glimmerelk')!);
  assert.ok(counts.get('glimmerelk')! < counts.get('mossbun')!);
  assert.equal(counts.size, SPECIES.length);
});
