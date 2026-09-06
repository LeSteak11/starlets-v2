import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BALANCE as B,
  developedPotential,
  DEFAULT_CARDS,
  SPECIES,
} from './balance.ts';
import {
  newSave,
  scan,
  beginEncounter,
  tether,
  dismissResult,
  regenerate,
  parseSave,
  qualityAt,
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
void test('species rarity owns potential; launch totals and trained Common viability hold', () => {
  const totals = { Common: 12, Rare: 7, Epic: 4, Legendary: 1 };
  for (const rarity of Object.keys(totals) as (keyof typeof totals)[])
    assert.equal(
      B.launch.defaultCards[rarity] + B.launch.alternateCards[rarity],
      totals[rarity],
    );
  assert.ok(DEFAULT_CARDS.every((c) => !('rarity' in c) && !('stats' in c)));
  assert.ok(
    developedPotential('Common', 30, 'Zenith') >
      developedPotential('Legendary', 1, 'Origin'),
  );
  assert.ok(developedPotential('Legendary', 30, 'Zenith') <= 100);
});
