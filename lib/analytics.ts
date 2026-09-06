/**
 * Event sink. Logs to the console today and posts nowhere -- swapping in a
 * real endpoint is a change to `sink` alone, and nothing that calls track()
 * needs to know. Instrument now or the retention data is gone permanently.
 */
export type GameEvent =
  | {
      name: 'session_start';
      discovered: number;
      owned: number;
      packsStored: number;
    }
  | { name: 'pack_open'; source: 'timer'; pity: number; opened: number }
  | {
      name: 'card_granted';
      cardId: string;
      rarity: string;
      speciesId: string;
      source: 'flip' | 'pack' | 'intro';
      newSlot: boolean;
      duplicate: boolean;
      band?: 'low' | 'mid' | 'high';
    }
  | { name: 'page_progress'; zone: string; owned: number; total: number };
type Sink = (event: GameEvent & { at: number }) => void;
const consoleSink: Sink = (event) => {
  // eslint-disable-next-line no-console
  console.info('[starlets]', event.name, event);
};
let sink: Sink = consoleSink;
/** Point events somewhere real. Called once at startup when a backend exists. */
export const setSink = (next: Sink) => {
  sink = next;
};
export function track(event: GameEvent) {
  try {
    sink({ ...event, at: Date.now() });
  } catch {
    /* Telemetry must never break the game. */
  }
}
