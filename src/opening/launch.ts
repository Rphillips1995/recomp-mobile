import Storage from 'expo-sqlite/kv-store';
import { QUOTES, OpeningQuote } from './quotes';

// kv-store uses its own database, leaving recomp.db and workouts untouched.
const QUOTE_CURSOR_KEY = 'recomp.opening.nextQuote.v1';
let launchQuote: Promise<OpeningQuote> | undefined;
let completed = false;

export function hasCompletedOpening() {
  return completed;
}

export function completeOpening() {
  completed = true;
}

export function getLaunchQuote(): Promise<OpeningQuote> {
  // One selection per JS launch, including skipped intros. Strict Mode effect
  // replays and root remounts must not advance the quote a second time.
  if (!launchQuote) {
    launchQuote = (async () => {
      let index = 0;
      try {
        const stored = await Storage.getItem(QUOTE_CURSOR_KEY);
        const candidate = Number(stored);
        if (Number.isSafeInteger(candidate) && candidate >= 0 && candidate < QUOTES.length) {
          index = candidate;
        }
      } catch {
        // A preference failure must never block access to training.
      }
      try {
        await Storage.setItem(QUOTE_CURSOR_KEY, String((index + 1) % QUOTES.length));
      } catch {
        // Still show the selected quote if persistence is unavailable.
      }
      return QUOTES[index];
    })();
  }
  return launchQuote;
}
