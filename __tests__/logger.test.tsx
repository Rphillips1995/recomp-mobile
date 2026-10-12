import React from 'react';
import { Alert } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App from '../App';
import { Workout } from '../src/workout';

const original: Workout = { id: 'old', date: '2026-10-10T12:00:00Z', name: 'Original session', exercises: [
  { name: 'Bench', type: 'strength', sets: [
    { weight: '100', reps: '5', minutes: '', distance: '' },
    { weight: '110', reps: '3', minutes: '', distance: '' },
  ] },
  { name: 'Walk', type: 'cardio', sets: [{ weight: '', reps: '', minutes: '20', distance: '1' }] },
] };
let mockRows: Workout[] = [];
const mockDatabase = { execAsync: jest.fn(), getAllAsync: jest.fn(), runAsync: jest.fn() };
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDatabase) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../src/opening/launch', () => ({ hasCompletedOpening: () => true }));
let tree: ReactTestRenderer;

beforeEach(() => {
  mockRows = JSON.parse(JSON.stringify([original]));
  mockDatabase.execAsync.mockResolvedValue(undefined);
  mockDatabase.getAllAsync.mockImplementation(async () => mockRows.map(workout => ({ json: JSON.stringify(workout) })));
  mockDatabase.runAsync.mockReset().mockImplementation(async (sql: string, ...args: string[]) => {
    if (sql.startsWith('UPDATE')) {
      const index = mockRows.findIndex(workout => workout.id === args[1]);
      if (index < 0) return { changes: 0 };
      mockRows[index] = JSON.parse(args[0]);
    } else if (sql.startsWith('INSERT')) mockRows.push(JSON.parse(args[2]));
    else if (sql.startsWith('DELETE')) mockRows = mockRows.filter(workout => workout.id !== args[0]);
    return { changes: 1 };
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { act(() => tree?.unmount()); jest.restoreAllMocks(); });
async function render() { await act(async () => { tree = create(<App/>); }); }
function action(label: string) {
  const node = tree.root.findAll(node => typeof node.props.onPress === 'function').find(node =>
    node.props.accessibilityLabel === label || node.findAll(child => child.props.children === label).length > 0);
  if (!node) throw new Error(`Missing action ${label}`);
  return node;
}
async function press(label: string) { await act(async () => { await action(label).props.onPress(); }); }
function input(label: string, value: string) { act(() => tree.root.findByProps({ accessibilityLabel: label }).props.onChangeText(value)); }
function confirm(label: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  const button = buttons?.find(button => button.text === label);
  if (!button?.onPress) throw new Error(`Missing confirmation ${label}`);
  return button.onPress();
}
function visible(text: string) { return tree.root.findAll(node => node.props.children === text).length > 0; }
async function expand(id = 'old') { await act(async () => { tree.root.findByProps({ testID: `archive-session-${id}` }).props.onPress(); }); }
async function edit() { await press('ARCHIVE'); await expand(); await press('EDIT SESSION'); }

it('updates the same saved session, preserves its id/date, and survives remount', async () => {
  await render(); await edit();
  input('Workout name', 'Corrected session'); input('Bench weight set 1', '125');
  await press('SAVE CHANGES  →');
  expect(mockDatabase.runAsync).toHaveBeenCalledTimes(1);
  expect(mockDatabase.runAsync.mock.calls[0][0]).toBe('UPDATE workouts SET json=? WHERE id=?');
  expect(mockRows).toHaveLength(1);
  expect(mockRows[0]).toMatchObject({ id: original.id, date: original.date, name: 'Corrected session' });
  expect(mockRows[0].exercises[0].sets[0].weight).toBe('125');
  expect(visible('Corrected session')).toBe(true);
  act(() => tree.unmount()); await render(); await press('ARCHIVE');
  expect(visible('Corrected session')).toBe(true);
});

it('cancels edits without changing saved data and preserves a separate active workout', async () => {
  await render(); await press('BEGIN TRAINING  →'); input('Workout name', 'Active training');
  await edit(); input('Workout name', 'Do not save');
  await press('CANCEL EDITING'); act(() => { confirm('Discard changes'); });
  expect(mockDatabase.runAsync).not.toHaveBeenCalled(); expect(mockRows[0]).toEqual(original);
  await press('TRAIN'); expect(tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.value).toBe('Active training');
});

it('saving an archive edit also preserves the active workout', async () => {
  await render(); await press('BEGIN TRAINING  →'); input('Workout name', 'Still active');
  await edit(); input('Workout name', 'Saved correction'); await press('SAVE CHANGES  →');
  await press('TRAIN'); expect(tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.value).toBe('Still active');
});

it('removes one set, offers undo, and saves only the remaining set and cardio interval', async () => {
  await render(); await edit();
  await press('Remove Bench set 1'); expect(tree.root.findByProps({ accessibilityLabel: 'Bench weight set 1' }).props.value).toBe('110');
  await press('UNDO REMOVE'); expect(tree.root.findByProps({ accessibilityLabel: 'Bench weight set 1' }).props.value).toBe('100');
  await press('Remove Bench set 1'); await press('SAVE CHANGES  →');
  expect(mockRows[0].exercises[0].sets).toEqual([original.exercises[0].sets[1]]);
  expect(mockRows[0].exercises[1]).toEqual(original.exercises[1]);
});

it('removes cardio intervals and prevents an entirely empty edit from replacing saved data', async () => {
  await render(); await edit();
  await press('Remove Bench set 2'); await press('Remove Bench set 1'); await press('Remove Walk interval 1');
  await press('SAVE CHANGES  →');
  expect(mockDatabase.runAsync).not.toHaveBeenCalled(); expect(mockRows[0]).toEqual(original);
  expect(Alert.alert).toHaveBeenCalledWith('Check your session', 'Enter at least one completed set or cardio interval.');
  await press('UNDO REMOVE'); await press('SAVE CHANGES  →');
  expect(mockRows[0].exercises).toEqual([original.exercises[1]]);
});

it('keeps the draft after a failed update so retry can save it', async () => {
  await render(); await edit(); input('Workout name', 'Retry this');
  mockDatabase.runAsync.mockRejectedValueOnce(new Error('disk unavailable'));
  await press('SAVE CHANGES  →');
  expect(tree.root.findByProps({ accessibilityLabel: 'Workout name' }).props.value).toBe('Retry this');
  expect(mockRows[0]).toEqual(original);
  await press('SAVE CHANGES  →'); expect(mockRows[0].name).toBe('Retry this');
});

it('does not resurrect a missing saved session when an update affects no rows', async () => {
  await render(); await edit(); mockRows = [];
  await press('SAVE CHANGES  →');
  expect(jest.mocked(Alert.alert).mock.calls.at(-1)?.[0]).toBe('Save failed');
  expect(visible('SAVE CHANGES  →')).toBe(true);
});

it('blocks rapid double-save before React can disable the button', async () => {
  await render(); await edit();
  let resolve!: (value: { changes: number }) => void;
  mockDatabase.runAsync.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const save = action('SAVE CHANGES  →').props.onPress;
  act(() => { save(); save(); });
  expect(mockDatabase.runAsync).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ changes: 1 }); });
});

it('marks a stronger set as a PR and removes its badge after correcting it down', async () => {
  mockRows.unshift({ ...original, id: 'new', date: '2026-10-11T12:00:00Z', name: 'Newer session', exercises: [
    { name: 'Bench', type: 'strength', sets: [{ weight: '150', reps: '5', minutes: '', distance: '' }] },
  ] });
  await render(); await press('ARCHIVE'); await expand('new');
  expect(JSON.stringify(tree.toJSON())).toContain('Heaviest set · 150 lb');
  await press('EDIT SESSION'); input('Bench weight set 1', '90'); await press('SAVE CHANGES  →'); await expand('new'); await expand();
  expect(JSON.stringify(tree.toJSON())).not.toContain('Heaviest set · 150 lb');
  expect(JSON.stringify(tree.toJSON())).toContain('Heaviest set · 110 lb');
});

it('recalculates records when deleting the session that holds them', async () => {
  mockRows.unshift({ ...original, id: 'new', date: '2026-10-11T12:00:00Z', name: 'Newer session', exercises: [
    { name: 'Bench', type: 'strength', sets: [{ weight: '150', reps: '5', minutes: '', distance: '' }] },
  ] });
  await render(); await press('ARCHIVE'); await expand('new'); await press('DELETE SESSION');
  await act(async () => { await confirm('Delete'); });
  expect(mockRows).toHaveLength(1); await expand();
  expect(JSON.stringify(tree.toJSON())).toContain('Heaviest set · 110 lb');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Heaviest set · 150 lb');
});

it('leaves the archive and records unchanged when deletion fails', async () => {
  await render(); await press('ARCHIVE'); await expand();
  mockDatabase.runAsync.mockRejectedValueOnce(new Error('disk unavailable'));
  await press('DELETE SESSION'); await act(async () => { await confirm('Delete'); });
  expect(visible('Original session')).toBe(true); expect(mockRows).toEqual([original]);
  expect(jest.mocked(Alert.alert).mock.calls.at(-1)?.[0]).toBe('Delete failed');
});

it('previews and announces an improved record only after a new session saves', async () => {
  await render(); await press('BEGIN TRAINING  →');
  input('New exercise name', 'bench'); await press('+ ADD EXERCISE');
  input('bench weight set 1', '120'); input('bench reps set 1', '5');
  expect(JSON.stringify(tree.toJSON())).toContain('PR IF SAVED');
  expect(mockDatabase.runAsync).not.toHaveBeenCalled();
  await press('COMPLETE SESSION  →');
  expect(mockRows).toHaveLength(2);
  expect(Alert.alert).toHaveBeenCalledWith('Session recorded', expect.stringContaining('Heaviest set · 120 lb'));
});

it('does not announce the existing record when saving an unchanged session', async () => {
  await render(); await edit(); await press('SAVE CHANGES  →');
  expect(Alert.alert).toHaveBeenCalledWith('Session updated', 'Your record has been updated.');
});

it('keeps a new session on failed insertion and retries without duplicate saves', async () => {
  await render(); await press('BEGIN TRAINING  →');
  input('New exercise name', 'Bench'); await press('+ ADD EXERCISE');
  input('Bench weight set 1', '120'); input('Bench reps set 1', '5');
  mockDatabase.runAsync.mockRejectedValueOnce(new Error('disk unavailable'));
  await press('COMPLETE SESSION  →');
  expect(mockRows).toHaveLength(1);
  expect(tree.root.findByProps({ accessibilityLabel: 'Bench weight set 1' }).props.value).toBe('120');
  await press('COMPLETE SESSION  →'); expect(mockRows).toHaveLength(2);
});

it('starts archive sessions collapsed, shows gold markers, and toggles details and actions', async () => {
  await render(); await press('ARCHIVE');
  expect(visible('Original session')).toBe(true);
  expect(visible('***')).toBe(true);
  expect(visible('EDIT SESSION')).toBe(false);
  expect(JSON.stringify(tree.toJSON())).not.toContain('Heaviest set · 110 lb');
  expect(tree.root.findByProps({ testID: 'archive-session-old' }).props.accessibilityState.expanded).toBe(false);
  await expand();
  expect(visible('EDIT SESSION')).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Heaviest set · 110 lb');
  await expand();
  expect(visible('EDIT SESSION')).toBe(false);
  expect(visible('***')).toBe(true);
});

it('does not show stars for a session that holds no current personal best', async () => {
  mockRows.unshift({ ...original, id: 'new', date: '2026-10-11T12:00:00Z', name: 'Tie session' });
  await render(); await press('ARCHIVE');
  const tied = tree.root.findByProps({ testID: 'archive-session-new' });
  expect(tied.findAll(node => node.props.children === '***')).toHaveLength(0);
  const holder = tree.root.findByProps({ testID: 'archive-session-old' });
  expect(holder.findAll(node => node.props.children === '***').length).toBeGreaterThan(0);
});
