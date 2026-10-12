// Original Recomp writing, bundled for offline use.
export const QUOTES = [
  { theme: 'RESPONSIBILITY', text: 'Build the strength to be there when it matters.' },
  { theme: 'MORTALITY', text: 'This day will not return. Give some of it to the work.' },
  { theme: 'STOICISM', text: 'You cannot choose the weight of the day. You can choose how you meet it.' },
  { theme: 'RESPONSIBILITY', text: 'Care becomes real in what you are willing to do.' },
  { theme: 'MORTALITY', text: 'Time makes no promises. Begin with what remains.' },
  { theme: 'STOICISM', text: 'Let the noise pass. Keep the promise you made to yourself.' },
  { theme: 'RESPONSIBILITY', text: 'Someone may need your steadiness. Practice it here.' },
  { theme: 'MORTALITY', text: 'What you can do today is worth protecting.' },
  { theme: 'STOICISM', text: 'The outcome is uncertain. The next honest effort is yours.' },
] as const;

export type OpeningQuote = (typeof QUOTES)[number];
