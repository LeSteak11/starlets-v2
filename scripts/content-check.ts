import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BALANCE as B, RARITIES, SPECIES } from '../lib/balance.ts';
import { CARD_ROLES, FINISHES } from '../lib/cards.ts';
import { SET_01 } from '../content/set-01.ts';
/**
 * Validates authored card content and reports every problem at once, with the
 * card number and the field name. Content authors run this; it must never be
 * the app that explains a typo by refusing to boot.
 *
 * Errors fail the build. Warnings do not -- a missing illustration or a set
 * mid-rebalance is a Tuesday, not an outage.
 */
const errors: string[] = [];
const warnings: string[] = [];
const fail = (subject: string, message: string) =>
  errors.push(`x ${subject.padEnd(12)} ${message}`);
const warn = (subject: string, message: string) =>
  warnings.push(`! ${subject.padEnd(12)} ${message}`);
const onDisk = (path: string) => join('public', path.replace(/^\//, ''));
const speciesById = new Map(SPECIES.map((s) => [s.id as string, s]));
const seen = new Map<string, number>();
for (const card of SET_01) {
  const at = card.cardId || `#${card.number}`;
  if (seen.has(card.cardId))
    fail(at, `duplicate cardId (also card ${seen.get(card.cardId)})`);
  seen.set(card.cardId, card.number);
  if (!RARITIES.includes(card.rarity))
    fail(at, `rarity '${card.rarity}' is not a valid Rarity`);
  if (!FINISHES.includes(card.finish))
    fail(at, `finish '${card.finish}' is not a valid Finish`);
  if (!CARD_ROLES.includes(card.role))
    fail(at, `role '${card.role}' is not a valid CardRole`);
  if (card.numberMax !== SET_01.length)
    fail(at, `numberMax ${card.numberMax} but the set holds ${SET_01.length}`);
  const species = speciesById.get(card.speciesId);
  if (!species) {
    fail(at, `speciesId '${card.speciesId}' is not in the roster`);
    continue;
  }
  if (card.core !== species.core)
    fail(
      at,
      `core '${card.core}' does not match species '${species.id}' (${species.core})`,
    );
  if (card.zone !== species.zone)
    fail(
      at,
      `zone '${card.zone}' does not match species '${species.id}' (${species.zone})`,
    );
  if (!existsSync(onDisk(card.art)))
    warn(at, `art '${card.art}' not found on disk -- placeholder in use`);
  else if (statSync(onDisk(card.art)).size > B.art.maxBytes)
    fail(
      at,
      `art is ${Math.round(statSync(onDisk(card.art)).size / 1024)} KB, budget is ${B.art.maxBytes / 1024} KB`,
    );
}
for (let n = 1; n <= SET_01.length; n++)
  if (!SET_01.some((c) => c.number === n))
    fail(
      'set',
      `${SET_01.length} cards declared, number ${String(n).padStart(3, '0')} missing`,
    );
for (const species of SPECIES) {
  const bases = SET_01.filter((c) => c.speciesId === species.id && c.isBase);
  if (bases.length !== 1)
    fail(
      species.id,
      `has ${bases.length} base cards (${bases.map((c) => c.cardId).join(', ') || 'none'}) -- exactly 1 required`,
    );
  const sprite = onDisk(species.catchSprite);
  if (!existsSync(sprite))
    warn(species.id, `catchSprite '${species.catchSprite}' not found on disk`);
  else if (statSync(sprite).size > B.art.maxBytes)
    fail(
      species.id,
      `catchSprite is ${Math.round(statSync(sprite).size / 1024)} KB, budget is ${B.art.maxBytes / 1024} KB`,
    );
}
if (SET_01.length !== B.set01.cards)
  warn('set', `${SET_01.length} cards, design target is ${B.set01.cards}`);
for (const rarity of RARITIES) {
  const have = SET_01.filter((c) => c.rarity === rarity).length;
  const want = B.set01.byRarity[rarity];
  if (have !== want) warn('set', `${have} ${rarity}, design target is ${want}`);
}
for (const line of warnings) console.warn(line);
for (const line of errors) console.error(line);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
console.log(
  errors.length
    ? `${plural(errors.length, 'error')}, ${plural(warnings.length, 'warning')}`
    : `Set 01 content OK - ${SET_01.length} cards, ${plural(warnings.length, 'warning')}`,
);
if (errors.length) process.exit(1);
