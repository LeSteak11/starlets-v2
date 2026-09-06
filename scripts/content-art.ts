import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BALANCE as B, SPECIES } from '../lib/balance.ts';
import { SET_01 } from '../content/set-01.ts';
/**
 * Art budget report. Answers "is the content shippable?" in one command:
 * what is missing, what is over budget, and what the set weighs today.
 */
const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;
const budget = B.art.maxBytes;
const rows: { label: string; path: string }[] = [
  ...SET_01.map((c) => ({ label: c.cardId, path: c.art })),
  ...SPECIES.map((s) => ({ label: `${s.id} sprite`, path: s.catchSprite })),
];
let missing = 0;
let over = 0;
let total = 0;
for (const row of rows) {
  const path = join('public', row.path.replace(/^\//, ''));
  if (!existsSync(path)) {
    missing++;
    console.warn(`! ${row.label.padEnd(16)} missing  ${row.path}`);
    continue;
  }
  const bytes = statSync(path).size;
  total += bytes;
  if (bytes > budget) {
    over++;
    console.error(
      `x ${row.label.padEnd(16)} ${kb(bytes)} over the ${kb(budget)} budget  ${row.path}`,
    );
  }
}
const orphans = existsSync('public/cards/lun01')
  ? readdirSync('public/cards/lun01').filter(
      (f) => !SET_01.some((c) => c.art.endsWith(`/${f}`)),
    )
  : [];
for (const file of orphans)
  console.warn(
    `! orphan           public/cards/lun01/${file} is not referenced by any card`,
  );
console.log(
  `${rows.length - missing}/${rows.length} assets present, ${over} over budget, ${orphans.length} orphaned — ${kb(total)} total`,
);
if (over) process.exit(1);
