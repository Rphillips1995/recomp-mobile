import React from 'react';
import { AccessibilityInfo, Alert, Animated, AppState, AppStateStatus } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App from '../App';
import { OpeningSequence } from '../src/opening/OpeningSequence';
import { QUOTES } from '../src/opening/quotes';

const mockDatabase = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  runAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDatabase) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
const mockGetLaunchQuote = jest.fn();
let mockCompleted = false;
jest.mock('../src/opening/launch', () => ({
  getLaunchQuote: () => mockGetLaunchQuote(),
  hasCompletedOpening: () => mockCompleted,
  completeOpening: () => { mockCompleted = true; },
}));

let tree: ReactTestRenderer;
let appStateChange: (state: AppStateStatus) => void;
let removeListener: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  mockCompleted = false;
  mockGetLaunchQuote.mockReset().mockResolvedValue(QUOTES[0]);
  mockDatabase.getAllAsync.mockResolvedValue([]);
  mockDatabase.runAsync.mockClear();
  removeListener = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateChange = listener;
    return { remove: removeListener };
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  if (tree) act(() => tree.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function render(element: React.ReactElement) {
  await act(async () => { tree = create(element); });
}
function skip() {
  act(() => tree.root.findByProps({ testID: 'opening-skip' }).props.onPress());
}
function press(label: string) {
  const button = tree.root.findAll(node => typeof node.props.onPress === 'function').find(node =>
    node.findAll(child => child.props.children === label).length > 0);
  if (!button) throw new Error(`Missing button: ${label}`);
  act(() => button.props.onPress());
}

it('automatically reveals the dashboard and removes listeners when the sequence ends', async () => {
  await render(<App />);
  expect(tree.root.findAllByType(OpeningSequence)).toHaveLength(1);
  await act(async () => { jest.advanceTimersByTime(7000); });
  expect(tree.root.findAllByType(OpeningSequence)).toHaveLength(0);
  expect(mockCompleted).toBe(true);
  expect(removeListener).toHaveBeenCalled();
});

it('skips immediately during loading and ignores late asynchronous work', async () => {
  let resolveQuote!: (quote: typeof QUOTES[0]) => void;
  mockGetLaunchQuote.mockReturnValue(new Promise(resolve => { resolveQuote = resolve; }));
  const onComplete = jest.fn();
  await render(<OpeningSequence onComplete={onComplete} />);
  act(() => tree.root.findByProps({ testID: 'opening-skip' }).props.onPress());
  await act(async () => { resolveQuote(QUOTES[0]); jest.advanceTimersByTime(10000); });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it.each([1500, 4600])('skips during the quote or wordmark at %i ms without completing twice', async elapsed => {
  const onComplete = jest.fn();
  await render(<OpeningSequence onComplete={onComplete} />);
  act(() => { jest.advanceTimersByTime(elapsed); });
  act(() => tree.root.findByProps({ testID: 'opening-skip' }).props.onPress());
  act(() => { jest.advanceTimersByTime(10000); });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it('dismisses when backgrounded mid-intro and stays dismissed on resume or remount', async () => {
  await render(<App />);
  act(() => appStateChange('background'));
  act(() => appStateChange('active'));
  expect(tree.root.findAllByType(OpeningSequence)).toHaveLength(0);
  act(() => tree.unmount());
  await render(<App />);
  expect(tree.root.findAllByType(OpeningSequence)).toHaveLength(0);
});

it('uses static transitions with Reduce Motion enabled', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  const timing = jest.spyOn(Animated, 'timing');
  const onComplete = jest.fn();
  await render(<OpeningSequence onComplete={onComplete} />);
  const opacityTransitions = timing.mock.calls.filter(([_value, config]) => config.useNativeDriver);
  expect(opacityTransitions.length).toBeGreaterThan(0);
  expect(opacityTransitions.every(([_value, config]) => config.duration === 0)).toBe(true);
  act(() => { jest.advanceTimersByTime(5000); });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it('finishes with a bundled fallback if preferences never respond', async () => {
  mockGetLaunchQuote.mockReturnValue(new Promise(() => {}));
  const onComplete = jest.fn();
  await render(<OpeningSequence onComplete={onComplete} />);
  act(() => { jest.advanceTimersByTime(800); });
  expect(tree.root.findByProps({ testID: 'opening-skip' }).props.accessibilityLabel).toContain(QUOTES[0].text);
  act(() => { jest.advanceTimersByTime(5000); });
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it('preserves an active workout through background/resume and saves through the existing database', async () => {
  await render(<App />);
  skip();
  press('BEGIN TRAINING  →');
  act(() => tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.onChangeText('Lunch training'));
  const exerciseInput = tree.root.findByProps({ placeholder: 'Exercise name' });
  act(() => exerciseInput.props.onChangeText('Squat'));
  press('+ ADD EXERCISE');
  act(() => tree.root.findByProps({ accessibilityLabel: 'Squat weight set 1' }).props.onChangeText('135'));
  act(() => tree.root.findByProps({ accessibilityLabel: 'Squat reps set 1' }).props.onChangeText('5'));
  act(() => { appStateChange('background'); appStateChange('active'); });
  expect(tree.root.findAllByType(OpeningSequence)).toHaveLength(0);
  expect(tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.value).toBe('Lunch training');
  expect(tree.root.findByProps({ accessibilityLabel: 'Squat weight set 1' }).props.value).toBe('135');
  await act(async () => { press('COMPLETE SESSION  →'); });
  expect(mockDatabase.runAsync).toHaveBeenCalledWith(
    'INSERT INTO workouts(id,date,json) VALUES(?,?,?)', expect.any(String), expect.any(String),
    expect.stringContaining('"weight":"135","reps":"5"'),
  );
  expect(Alert.alert).toHaveBeenCalledWith('Session recorded', 'The work continues.');
});

it('shows existing archived sessions after dismissing the intro without writing to workouts', async () => {
  mockDatabase.getAllAsync.mockResolvedValue([{ json: JSON.stringify({
    id: 'existing', date: '2026-10-10T12:00:00Z', name: 'Previous session',
    exercises: [{ name: 'Walk', type: 'cardio', sets: [{ weight: '', reps: '', minutes: '20', distance: '1' }] }],
  }) }]);
  await render(<App />);
  skip();
  press('ARCHIVE');
  expect(tree.root.findAll(node => node.props.children === 'Previous session').length).toBeGreaterThan(0);
  expect(mockDatabase.runAsync).not.toHaveBeenCalled();
});

it('cancels pending animations and callbacks when unmounted', async () => {
  const onComplete = jest.fn();
  await render(<OpeningSequence onComplete={onComplete} />);
  act(() => { jest.advanceTimersByTime(1500); tree.unmount(); });
  act(() => { jest.advanceTimersByTime(10000); });
  expect(onComplete).not.toHaveBeenCalled();
  expect(removeListener).toHaveBeenCalled();
});

it('returns to an active workout from The Record without replacing its name or sets', async () => {
  await render(<App />);
  skip();
  press('BEGIN TRAINING  →');
  act(() => tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.onChangeText('Keep this workout'));
  act(() => tree.root.findByProps({ placeholder: 'Exercise name' }).props.onChangeText('Squat'));
  press('+ ADD EXERCISE');
  act(() => tree.root.findByProps({ accessibilityLabel: 'Squat weight set 1' }).props.onChangeText('135'));
  act(() => tree.root.findByProps({ accessibilityLabel: 'Squat reps set 1' }).props.onChangeText('5'));
  press('RECORD');
  expect(tree.root.findAll(node => node.props.children === 'CONTINUE TRAINING  →').length).toBeGreaterThan(0);
  press('CONTINUE TRAINING  →');
  expect(tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.value).toBe('Keep this workout');
  expect(tree.root.findByProps({ accessibilityLabel: 'Squat weight set 1' }).props.value).toBe('135');
  expect(tree.root.findByProps({ accessibilityLabel: 'Squat reps set 1' }).props.value).toBe('5');
});
