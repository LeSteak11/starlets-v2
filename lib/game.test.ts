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
  accruePacks,
  openPack,
  applyGrant,
} from './game.ts';
import {
  claimExpedition,
  dispatchExpedition,
  expeditionResult,
  setExpeditionTeam,
} from './expeditions.ts';
import { CARD_TRAITS } from '../content/expeditions.ts';
import { printingFor, qualityBand, rollPack, snapToLine } from './flip.ts';
import type { Save } from './game.ts';
const rng = () => 0.5;
function finish(s: Save, perfect = false) {
  while (s.encounter?.stage === 'lock')
    s = tether(s, (s.encounter.target + (perfect ? 0 : 180)) % 360, 1000, rng);
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
    assert.equal(s.encounter?.newSlot, true);
    assert.equal(s.sparks, 7 + i);
    const settled = s;
    assert.deepEqual(tether(s, 0, 1000, rng), settled);
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
  s = tether(s, s.encounter!.target, 1000, rng);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
void test('a bad flip still grants a card, on that species own line', () => {
  let s = normal();
  s = finish(beginEncounter(scan(s, rng, 1000), 1000));
  const e = s.encounter!;
  // Every flip grants. There is no failed catch and no empty-handed result.
  assert.ok(e.granted);
  const card = CATALOGUE.get(e.granted!)!;
  assert.equal(card.speciesId, e.speciesId);
  assert.ok(e.reward > 0);
  assert.equal(e.newSlot, true);
});
void test('quality bands map to the species own printings, never to another animal', () => {
  assert.equal(qualityBand(['Miss', 'Miss', 'Miss', 'Miss']), 'low');
  assert.equal(qualityBand(['Good', 'Good', 'Good', 'Good']), 'mid');
  assert.equal(qualityBand(['Perfect', 'Perfect', 'Perfect']), 'high');
  // Glimmerelk prints rare, legendary and secret -- there is no bad one.
  const elk = CATALOGUE.lineFor('glimmerelk');
  assert.equal(snapToLine(elk, 'common'), 'rare');
  assert.equal(snapToLine(elk, 'uncommon'), 'rare');
  assert.equal(snapToLine(elk, 'legendary'), 'legendary');
  // Mossbun has no secret, so the top band snaps back down its own line.
  assert.equal(snapToLine(CATALOGUE.lineFor('mossbun'), 'secret'), 'rare');
  // Ties resolve toward the commoner side: snapping never quietly promotes.
  assert.equal(
    snapToLine(CATALOGUE.lineFor('selenith'), 'common'),
    'legendary',
  );
  for (const band of ['low', 'mid', 'high'] as const)
    for (const species of SPECIES) {
      const card = printingFor(CATALOGUE, species.id, band, () => 0.5);
      assert.ok(card, species.id);
      assert.equal(card!.speciesId, species.id);
    }
});
void test('duplicates raise the count and mint shards rather than paying nothing', () => {
  let s = finish(beginEncounter(scan(normal(), rng, 1000), 1000), true);
  const first = s.encounter!.granted!;
  assert.equal(s.encounter?.newSlot, true);
  assert.equal(s.encounter?.duplicate, false);
  assert.equal(s.shards, 0);
  s = finish(beginEncounter(scan(dismissResult(s), rng, 1000), 1000), true);
  assert.equal(s.records.novafox.caught, 2);
  // A second flip on a fixed rng lands the same printing: a real duplicate.
  assert.equal(s.encounter?.granted, first);
  assert.equal(s.encounter?.duplicate, true);
  assert.equal(s.encounter?.newSlot, false);
  assert.ok(s.shards > 0);
  assert.equal(s.owned[first].count, 2);
  assert.equal(s.records.novafox.firstCaught, 1000);
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
    JSON.stringify({ ...newSave(), version: 5 }),
    JSON.stringify({ ...newSave(), version: 2 }),
    JSON.stringify({ ...newSave(), owned: [] }),
    JSON.stringify({ ...newSave(), packs: null }),
    JSON.stringify({ ...newSave(), shards: -1 }),
    JSON.stringify({ ...newSave(), sparks: -1 }),
    JSON.stringify({ ...newSave(), encounter: {} }),
  ])
    assert.throws(() => parseSave(raw));
});
void test('packs accrue every 12h to a cap, and the clock only moves forward', () => {
  const start = newSave(0);
  assert.equal(start.packs.stored, 0);
  assert.equal(accruePacks(start, B.packs.timerMs - 1).packs.stored, 0);
  assert.equal(accruePacks(start, B.packs.timerMs).packs.stored, 1);
  assert.equal(accruePacks(start, B.packs.timerMs * 2).packs.stored, 2);
  // Capped: a week away is still two packs, not seven.
  assert.equal(
    accruePacks(start, B.packs.timerMs * 14).packs.stored,
    B.packs.stored,
  );
  // Winding the device clock backwards neither grants nor removes a pack.
  const ahead = accruePacks(start, B.packs.timerMs);
  assert.equal(accruePacks(ahead, 0).packs.stored, 1);
});
void test('opening a pack spends one, grants five cards, and fills slots', () => {
  let save = accruePacks(newSave(0), B.packs.timerMs * 2);
  assert.equal(save.packs.stored, 2);
  const { save: after, opening } = openPack(save, () => 0.5, 1000);
  assert.ok(opening);
  assert.equal(opening!.cardIds.length, B.packs.size);
  assert.equal(after.packs.stored, 1);
  assert.equal(after.packs.opened, 1);
  // Every card lands in the collection, dupes as counts.
  const held = Object.values(after.owned).reduce((n, o) => n + o.count, 0);
  assert.equal(held, B.packs.size);
  // Packs may hand over a species the player has never flipped. That is a
  // silhouette filling in, not a locked slot.
  assert.ok(opening!.newSlots.length > 0);
  // Each flagged card is the one that filled its slot -- a second copy of the
  // same species in the same pack is not a second new entry.
  const flaggedSpecies = opening!.newSlots.map(
    (cardId) => CATALOGUE.get(cardId)!.speciesId,
  );
  assert.equal(new Set(flaggedSpecies).size, flaggedSpecies.length);
  for (const speciesId of flaggedSpecies)
    assert.equal(after.records[speciesId].caught > 0, true);
  save = after;
  const empty = openPack(openPack(save, () => 0.5, 2000).save, () => 0.5, 2000);
  assert.equal(empty.opening, null);
});
void test('pack slots honour their guarantees, and pity delivers a secret by 40', () => {
  let rolls = 0;
  const cycling = () => (rolls++ * 0.37) % 1;
  for (let i = 0; i < 200; i++) {
    const { cards } = rollPack(CATALOGUE, 0, cycling);
    assert.equal(cards.length, B.packs.size);
    for (const card of cards.slice(0, 3))
      assert.ok(['common', 'uncommon'].includes(card.rarity), card.cardId);
    assert.ok(['rare', 'legendary'].includes(cards[3].rarity), cards[3].cardId);
    assert.ok(cards[4].rarity !== 'common');
  }
  // At the floor the hit slot is forced, whatever the dice say.
  const forced = rollPack(CATALOGUE, B.packs.secretPity - 1, () => 0.999999);
  assert.equal(forced.cards[4].rarity, 'secret');
  assert.ok(forced.hitSecret);
  assert.equal(forced.pity, 0);
  // And a dry run keeps counting rather than resetting.
  const dry = rollPack(CATALOGUE, 10, () => 0);
  assert.equal(dry.pity, 15);
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
  // Pages run in card order: page 1 opens on 001, not on whichever zone the
  // roster happens to list first.
  assert.deepEqual(
    pages.map((page) => page.cards[0].number),
    [1, 10, 19],
  );
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
void test('four landed tethers always catch, at worst-case variance', () => {
  const { perfect, good, miss, variance, threshold, tethers } = B.capture;
  const points = { Perfect: perfect, Good: good, Miss: miss };
  const worst = (seq: (keyof typeof points)[]) => {
    let meter = 0;
    for (const hit of seq) {
      meter += points[hit] - variance;
      if (meter >= threshold) return true;
    }
    return false;
  };
  // The floor of the promise: four Goods, every roll against the player.
  assert.equal(good * tethers - variance * tethers, threshold);
  assert.ok(worst(['Good', 'Good', 'Good', 'Good']));
  assert.ok(worst(['Good', 'Good', 'Good', 'Perfect']));
  assert.ok(worst(['Perfect', 'Perfect', 'Perfect']));
  // Dropping one tether is survivable, but only with accuracy behind it.
  assert.ok(worst(['Perfect', 'Perfect', 'Good', 'Miss']));
  assert.ok(!worst(['Perfect', 'Good', 'Good', 'Miss']));
  // And a genuinely bad run still fails, or accuracy would mean nothing.
  assert.ok(!worst(['Good', 'Good', 'Good', 'Miss']));
  assert.ok(!worst(['Miss', 'Miss', 'Miss', 'Miss']));
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
  assert.equal(save.version, 4);
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
  // Familiarity is gone, and the Phase 2 state starts empty rather than absent.
  assert.ok(!('familiarity' in save.records.mossbun));
  assert.equal(save.shards, 0);
  assert.equal(save.packs.stored, 0);
  assert.equal(save.packs.pity, 0);
  assert.throws(() => migrateLegacySave(JSON.stringify({ version: 4 })));
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
void test('every card has one Expedition trait from the six-word vocabulary', () => {
  assert.deepEqual(
    Object.keys(CARD_TRAITS).sort(),
    CATALOGUE.all.map((card) => card.cardId).sort(),
  );
  assert.equal(new Set(Object.values(CARD_TRAITS)).size, 6);
});
void test('v3 saves migrate without losing collection or resources', () => {
  const old = applyGrant(newSave(100), null, 'LUN-01-001', false, 100);
  const raw = JSON.stringify({
    ...old,
    version: 3,
    equipped: undefined,
    expedition: undefined,
    expeditionsCompleted: undefined,
  });
  const migrated = parseSave(raw);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.stardust, old.stardust);
  assert.deepEqual(migrated.owned, old.owned);
  assert.equal(migrated.equipped.mossbun, 'LUN-01-001');
});
void test('Expeditions validate ownership, improve by trait, persist, and claim once', () => {
  let save = newSave(0);
  for (const cardId of [
    'LUN-01-001',
    'LUN-01-002',
    'LUN-01-019',
    'LUN-01-022',
    'LUN-01-010',
    'LUN-01-012',
  ])
    save = applyGrant(save, null, cardId, false, 1);
  const baseTeam = [
    { speciesId: 'mossbun', cardId: 'LUN-01-001' },
    { speciesId: 'emberpanda', cardId: 'LUN-01-019' },
    { speciesId: 'novafox', cardId: 'LUN-01-010' },
  ];
  save = setExpeditionTeam(save, baseTeam);
  const base = expeditionResult(save.expedition);
  save = setExpeditionTeam(save, [
    { speciesId: 'mossbun', cardId: 'LUN-01-002' },
    { speciesId: 'emberpanda', cardId: 'LUN-01-022' },
    { speciesId: 'novafox', cardId: 'LUN-01-012' },
  ]);
  const improved = expeditionResult(save.expedition);
  assert.ok(improved.reward > base.reward);
  assert.equal(improved.tier, 'Perfect Match');
  const dispatched = dispatchExpedition(save, 1000);
  assert.deepEqual(parseSave(JSON.stringify(dispatched)), dispatched);
  assert.equal(claimExpedition(dispatched, 10999), dispatched);
  const claimed = claimExpedition(dispatched, 11000);
  assert.equal(claimed.stardust, dispatched.stardust + improved.reward);
  assert.equal(claimExpedition(claimed, 11000), claimed);
  const invalid = setExpeditionTeam(claimed, [
    { speciesId: 'mossbun', cardId: 'LUN-01-S1' },
  ]);
  assert.equal(invalid, claimed);
});
