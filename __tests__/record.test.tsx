import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { RecordScreen } from '../src/record/RecordScreen';
import { completedEntries, sessionSummary, trainingDays } from '../src/record/summary';
import { Workout } from '../src/workout';

const workout: Workout = {
  id: '1', date: new Date(2026, 9, 11, 9).toISOString(), name: 'Morning work',
  exercises: [
    { name: 'Squat', type: 'strength', sets: [
      { weight: '135', reps: '5', minutes: '', distance: '' },
      { weight: '', reps: '', minutes: '', distance: '' },
    ] },
    { name: 'Walk', type: 'cardio', sets: [
      { weight: '', reps: '', minutes: '20', distance: '' },
    ] },
  ],
};

it('counts distinct local training days rather than workouts or UTC dates', () => {
  const sameDay = { ...workout, id: '2', date: new Date(2026, 9, 11, 23, 59).toISOString() };
  const nextDay = { ...workout, id: '3', date: new Date(2026, 9, 12, 0, 1).toISOString() };
  expect(trainingDays([workout, sameDay, nextDay])).toBe(2);
  expect(trainingDays([])).toBe(0);
  expect(trainingDays([{ ...workout, date: 'invalid' }])).toBe(0);
});

it('summarizes strength and cardio entries without counting empty or invalid rows', () => {
  expect(completedEntries(workout)).toBe(2);
  expect(sessionSummary(workout)).toBe('2 exercises · 2 entries logged');
  const invalid: Workout = { ...workout, exercises: [{ name: 'Squat', type: 'strength', sets: [
    { weight: '-1', reps: '5', minutes: '', distance: '' },
    { weight: '0', reps: '5', minutes: '', distance: '' },
    { weight: '100', reps: '0', minutes: '', distance: '' },
    { weight: ' ', reps: '5', minutes: '', distance: '' },
  ] }] };
  expect(completedEntries(invalid)).toBe(1);
});

it('shows an honest empty state and starts training without a dead archive link', () => {
  let tree!: ReactTestRenderer;
  const onTrain = jest.fn();
  act(() => { tree = create(<RecordScreen history={[]} workout={null} onTrain={onTrain} onArchive={jest.fn()}/>); });
  const buttons = tree.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function');
  expect(buttons.length).toBeGreaterThan(0);
  expect(tree.root.findAll(node => node.props.children === 'Your completed sessions will live here.').length).toBeGreaterThan(0);
  expect(tree.root.findAll(node => String(node.props.accessibilityLabel).startsWith('View archive')).length).toBe(0);
  act(() => buttons[0].props.onPress());
  expect(onTrain).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('offers resume for an active workout and opens the archive from the latest entry', () => {
  let tree!: ReactTestRenderer;
  const onArchive = jest.fn();
  act(() => { tree = create(<RecordScreen history={[workout]} workout={workout} onTrain={jest.fn()} onArchive={onArchive}/>); });
  expect(tree.root.findAll(node => node.props.children === 'CONTINUE TRAINING  →').length).toBeGreaterThan(0);
  act(() => tree.root.findByProps({ accessibilityLabel: 'View archive. Latest session: Morning work' }).props.onPress());
  expect(onArchive).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
