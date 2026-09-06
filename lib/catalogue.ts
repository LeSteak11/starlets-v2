import { SET_01 } from '../content/set-01.ts';
import { buildCatalogue } from './cards.ts';
/** The one place content meets logic. Everything else imports this. */
export const CATALOGUE = buildCatalogue(SET_01);
