import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE as B, INTRO_SPECIES, SPECIES } from './balance.ts';
import { binderPages, cardCounter, secretTray } from './cards.ts';
import { CATALOGUE } from './catalogue.ts';
import { SET_01 } from '../content/set-01.ts';
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
  migrateLegacySave,
  grantCard,
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
    const base = CATALOGUE.baseFor(SPECIES[i].id)!.cardId;
    assert.equal(s.owned[base].count, 1);
    assert.equal(s.owned[base].source, 'intro');
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
  // Two catches, one Starbook slot, two copies held.
  assert.equal(Object.keys(s.owned).length, 1);
  assert.equal(s.owned[CATALOGUE.baseFor('novafox')!.cardId].count, 2);
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
    JSON.stringify({ ...newSave(), version: 3 }),
    JSON.stringify({ ...newSave(), version: 1 }),
    JSON.stringify({ ...newSave(), owned: [] }),
    JSON.stringify({ ...newSave(), sparks: -1 }),
    JSON.stringify({ ...newSave(), encounter: {} }),
  ])
    assert.throws(() => parseSave(raw));
});
void test('Set 01 is three pages of nine plus an unlisted secret tray', () => {
  assert.equal(SPECIES.length, B.set01.species);
  const numbered = SET_01.filter((c) => c.number !== null);
  const secrets = secretTray(SET_01);
  assert.equal(numbered.length, B.set01.numbered);
  assert.equal(secrets.length, B.set01.secrets);
  assert.equal(INTRO_SPECIES.length, 3);
  // The set boss is never a tutorial catch -- it stays a silhouette for weeks.
  assert.ok(!INTRO_SPECIES.map((s) => s.id as string).includes('selenith'));
  const counted: Record<string, number> = {};
  for (const c of SET_01) counted[c.rarity] = (counted[c.rarity] ?? 0) + 1;
  assert.deepEqual(counted, { ...B.set01.byRarity });
  assert.equal(new Set(SET_01.map((c) => c.cardId)).size, SET_01.length);
  numbered.forEach((c, i) => {
    assert.equal(c.number, i + 1);
    assert.equal(c.numberMax, numbered.length);
  });
  // Every zone is exactly one 3x3 page; secrets sit on none of them.
  const pages = binderPages(SET_01);
  assert.equal(pages.length, 3);
  for (const page of pages)
    assert.equal(page.cards.length, B.set01.pageSize, page.zone);
  assert.equal(
    pages.reduce((n, page) => n + page.cards.length, 0),
    numbered.length,
  );
  for (const secret of secrets) {
    assert.equal(secret.number, null);
    assert.equal(secret.rarity, 'secret');
    assert.equal(cardCounter(secret), 'UNLISTED');
    // Secrets are printings of somebody already in the book, never new species.
    assert.ok(SPECIES.some((s) => s.id === secret.speciesId));
  }
  assert.equal(cardCounter(SET_01[0]), '001/27');
  for (const species of SPECIES) {
    const line = CATALOGUE.lineFor(species.id);
    assert.ok(line.length >= 3, species.id);
    assert.equal(line.filter((c) => c.isBase).length, 1, species.id);
    assert.equal(CATALOGUE.baseFor(species.id)!.speciesId, species.id);
    // A catch always fills a numbered slot, never the chase tray.
    assert.notEqual(CATALOGUE.baseFor(species.id)!.number, null);
  }
});
void test('pack slots 1-3 never roll rare, and every slot is a real distribution', () => {
  assert.equal(B.packs.slots.length, B.packs.size);
  for (const slot of B.packs.slots) {
    const total = Object.values(slot).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, JSON.stringify(slot));
  }
  for (const slot of B.packs.slots.slice(0, 3)) {
    const odds = slot as Record<string, number>;
    assert.deepEqual(Object.keys(odds), ['common', 'uncommon']);
    // Uncommon in the floor slots, so early packs are not a five-card loop.
    assert.ok(odds.uncommon > 0);
  }
  // Slot 4 keeps its meaning only if the floor slots cannot reach rare.
  assert.ok(!('rare' in B.packs.slots[0]));
  assert.ok('rare' in B.packs.slots[3]);
  assert.ok('secret' in B.packs.slots[4]);
  assert.ok(B.packs.pityVisibleFrom < B.packs.secretPity);
});
void test('alts may outrank their base, and only three species start common', () => {
  assert.deepEqual(
    SET_01.filter((c) => c.isBase && c.rarity === 'common').map(
      (c) => c.speciesId,
    ),
    ['mossbun', 'dewlark', 'emberpanda'],
  );
  const emberpanda = CATALOGUE.lineFor('emberpanda');
  assert.equal(emberpanda.find((c) => c.isBase)!.rarity, 'common');
  assert.ok(emberpanda.some((c) => c.rarity === 'secret'));
  // The set boss has no common and no uncommon printing.
  assert.ok(
    !CATALOGUE.lineFor('selenith').some((c) =>
      ['common', 'uncommon'].includes(c.rarity),
    ),
  );
  // role and finish stay independent axes: a pose card may be printed foil.
  assert.ok(SET_01.every((c) => c.role !== 'base' || c.isBase));
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
void test('catching grants exactly one base card, and dupes raise the count', () => {
  let save = newSave(0);
  const base = CATALOGUE.baseFor('mossbun')!.cardId;
  save = grantCard(save.owned, base, 'catch', 5) && {
    ...save,
    owned: grantCard(save.owned, base, 'catch', 5),
  };
  assert.equal(save.owned[base].count, 1);
  assert.equal(save.owned[base].firstObtainedAt, 5);
  save = { ...save, owned: grantCard(save.owned, base, 'pack', 9) };
  assert.equal(save.owned[base].count, 2);
  // A dupe never rewrites when the card was first obtained, or its source.
  assert.equal(save.owned[base].firstObtainedAt, 5);
  assert.equal(save.owned[base].source, 'catch');
});
void test('Phase 1 saves migrate forward instead of being discarded', () => {
  const legacy = {
    version: 1,
    sparks: 4,
    regeneratedAt: 100,
    stardust: 60,
    introStep: 2,
    slowTiming: true,
    encounter: null,
    records: {
      mossbun: {
        caught: 3,
        familiarity: 0,
        speciesDust: 60,
        xp: 90,
        firstCaught: 42,
        cardIds: ['mossbun-default'],
      },
      novafox: {
        caught: 0,
        familiarity: 25,
        speciesDust: 0,
        xp: 0,
        firstCaught: null,
        cardIds: [],
      },
    },
  };
  const save = migrateLegacySave(JSON.stringify(legacy), 999);
  assert.equal(save.version, 2);
  assert.equal(save.stardust, 60);
  assert.equal(save.sparks, 4);
  assert.equal(save.records.mossbun.caught, 3);
  // Species added after the save was written start blank, not missing.
  assert.equal(save.records.selenith.caught, 0);
  const base = CATALOGUE.baseFor('mossbun')!.cardId;
  assert.equal(save.owned[base].count, 1);
  assert.equal(save.owned[base].firstObtainedAt, 42);
  assert.equal(save.owned[base].source, 'catch');
  assert.equal(Object.keys(save.owned).length, 1);
  assert.throws(() => migrateLegacySave(JSON.stringify({ version: 2 })));
});
void test('an owned card the catalogue does not know is a damaged save', () => {
  const save = newSave(0);
  for (const owned of [
    {
      'LUN-01-999': {
        cardId: 'LUN-01-999',
        count: 1,
        firstObtainedAt: 0,
        source: 'catch',
        favorite: false,
      },
    },
    {
      'LUN-01-001': {
        cardId: 'LUN-01-002',
        count: 1,
        firstObtainedAt: 0,
        source: 'catch',
        favorite: false,
      },
    },
    {
      'LUN-01-001': {
        cardId: 'LUN-01-001',
        count: 0,
        firstObtainedAt: 0,
        source: 'catch',
        favorite: false,
      },
    },
    {
      'LUN-01-001': {
        cardId: 'LUN-01-001',
        count: 1,
        firstObtainedAt: 0,
        source: 'gift',
        favorite: false,
      },
    },
  ])
    assert.throws(() => parseSave(JSON.stringify({ ...save, owned })));
  assert.doesNotThrow(() => parseSave(JSON.stringify(save)));
});
