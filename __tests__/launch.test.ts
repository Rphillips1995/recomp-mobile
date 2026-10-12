const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: mockStorage }));

beforeEach(() => {
  jest.resetModules();
  mockStorage.getItem.mockReset().mockResolvedValue(null);
  mockStorage.setItem.mockReset().mockResolvedValue(undefined);
});

it('selects once per launch and cycles through every quote before repeating', async () => {
  const { QUOTES } = require('../src/opening/quotes');
  let cursor: string | null = null;
  mockStorage.getItem.mockImplementation(async () => cursor);
  mockStorage.setItem.mockImplementation(async (_key, value) => { cursor = value; });
  const selected = [];
  for (let i = 0; i <= QUOTES.length; i++) {
    jest.resetModules(); // A new JS runtime, as on a cold launch.
    const { getLaunchQuote } = require('../src/opening/launch');
    const first = getLaunchQuote();
    expect(getLaunchQuote()).toBe(first);
    selected.push(await first);
  }
  expect(selected.slice(0, QUOTES.length)).toEqual(QUOTES);
  expect(selected[QUOTES.length]).toEqual(QUOTES[0]);
  expect(mockStorage.setItem).toHaveBeenCalledTimes(QUOTES.length + 1);
});

it.each(['broken', '-1', '0.5', '999', 'Infinity'])('recovers from invalid cursor %s', async value => {
  mockStorage.getItem.mockResolvedValue(value);
  const { getLaunchQuote } = require('../src/opening/launch');
  const { QUOTES } = require('../src/opening/quotes');
  expect(await getLaunchQuote()).toEqual(QUOTES[0]);
  expect(mockStorage.setItem).toHaveBeenCalledWith('recomp.opening.nextQuote.v1', '1');
});

it('still supplies a quote when preference reads and writes fail', async () => {
  mockStorage.getItem.mockRejectedValue(new Error('unavailable'));
  mockStorage.setItem.mockRejectedValue(new Error('unavailable'));
  const { getLaunchQuote } = require('../src/opening/launch');
  const { QUOTES } = require('../src/opening/quotes');
  expect(await getLaunchQuote()).toEqual(QUOTES[0]);
});

it('remembers completion only within this runtime', () => {
  let launch = require('../src/opening/launch');
  expect(launch.hasCompletedOpening()).toBe(false);
  launch.completeOpening();
  expect(launch.hasCompletedOpening()).toBe(true);
  jest.resetModules();
  launch = require('../src/opening/launch');
  expect(launch.hasCompletedOpening()).toBe(false);
});
