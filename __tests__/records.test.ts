import { Workout } from '../src/workout';
import { newRecords, recordBook } from '../src/logger/records';
import { cloneWorkout, prepareWorkout } from '../src/logger/workouts';

const strength = (id: string, weight: string, reps: string, name = 'Bench'): Workout => ({ id, date: `2026-10-${id.padStart(2, '0')}T12:00:00Z`, name: 'Session', exercises: [
  { name, type: 'strength', sets: [{ weight, reps, minutes: '', distance: '' }] },
] });
const cardio = (id: string, minutes: string, distance: string): Workout => ({ id, date: `2026-10-${id.padStart(2, '0')}T12:00:00Z`, name: 'Session', exercises: [
  { name: 'Run', type: 'cardio', sets: [{ weight: '', reps: '', minutes, distance }] },
] });

it('uses the first valid session as baseline and does not celebrate ties', () => {
  const first = strength('1', '100', '5');
  expect(recordBook([first]).size).toBe(2);
  expect(newRecords(first, [])).toEqual([]);
  expect(newRecords(strength('2', '100', '5'), [first])).toEqual([]);
  expect([...recordBook([strength('2', '100', '5'), first]).values()].every(record => record.workoutId === '1')).toBe(true);
});
it('compares reps only at the same weight and normalizes exercise names', () => {
  const first = strength('1', '100', '5', '  BENCH  press ');
  const better = strength('2', '100', '6', 'bench press');
  expect(newRecords(better, [first]).map(record => record.label)).toEqual(['Most reps at 100 lb · 6']);
  expect(newRecords(strength('3', '110', '3', 'bench press'), [first]).map(record => record.label)).toEqual(['Heaviest set · 110 lb']);
  expect(newRecords(strength('4', '90', '20', 'bench press'), [first])).toEqual([]);
});
it('recognizes cardio distance and duration independently without comparing exercise types', () => {
  expect(newRecords(cardio('2', '25', '3'), [cardio('1', '20', '2')])).toHaveLength(2);
  expect(newRecords(cardio('2', '25', ''), [cardio('1', '20', '2')]).map(record => record.label)).toEqual(['Longest interval · 25 min']);
  expect(newRecords(strength('2', '100', '5', 'Run'), [cardio('1', '20', '2')])).toEqual([]);
});
it('does not reannounce a record when its saved workout is unchanged', () => {
  const first = strength('1', '100', '5'), best = strength('2', '120', '5');
  expect(newRecords(best, [first, best])).toEqual([]);
  const raised = strength('2', '130', '5');
  expect(newRecords(raised, [first, best]).map(record => record.label)).toEqual(['Heaviest set · 130 lb']);
});
it('uses the best set in a session and recomputes after corrections and deletions', () => {
  const earlier = strength('1', '100', '5'), later = strength('2', '120', '5');
  later.exercises[0].sets.push({ weight: '130', reps: '3', minutes: '', distance: '' });
  expect(newRecords(later, [earlier]).map(record => record.label)).toEqual(['Heaviest set · 130 lb']);
  expect([...recordBook([earlier, later]).values()].find(record => record.label.startsWith('Heaviest'))?.value).toBe(130);
  later.exercises[0].sets = [{ weight: '90', reps: '5', minutes: '', distance: '' }];
  expect([...recordBook([earlier, later]).values()].find(record => record.label.startsWith('Heaviest'))?.value).toBe(100);
  expect([...recordBook([earlier]).values()].find(record => record.label.startsWith('Heaviest'))?.workoutId).toBe('1');
});
it.each([['-1', '5'], ['100', '0'], ['100', '2.5'], ['Infinity', '5'], ['', '5'], ['100', 'oops']])('rejects invalid strength values %s/%s', (weight, reps) => {
  const invalid = strength('1', weight, reps);
  expect(prepareWorkout(invalid).error).toBeDefined();
  expect(recordBook([invalid]).size).toBe(0);
});
it('supports zero-load strength and optional cardio distance, and strips blank rows', () => {
  expect(prepareWorkout(strength('1', '0', '10')).error).toBeUndefined();
  const value = cardio('1', ' 20,5 ', '');
  value.exercises[0].sets.push({ weight: '', reps: '', minutes: '', distance: '' });
  expect(prepareWorkout(value).workout?.exercises[0].sets).toEqual([{ weight: '', reps: '', minutes: '20.5', distance: '' }]);
});
it('clones every nested set before editing', () => {
  const value = strength('1', '100', '5');
  const cloned = cloneWorkout(value); cloned.exercises[0].sets[0].weight = '200';
  expect(value.exercises[0].sets[0].weight).toBe('100');
});
it.each([['0', '1'], ['20', '-1'], ['', '2'], ['garbage', '1']])('rejects invalid cardio %s/%s', (minutes, distance) => {
  expect(prepareWorkout(cardio('1', minutes, distance)).error).toBeDefined();
  expect(recordBook([cardio('1', minutes, distance)]).size).toBe(0);
});

it('accepts fractional number-pad values and recognizes increased load from zero', () => {
  expect(prepareWorkout(cardio('1', '.5', '1.')).workout?.exercises[0].sets[0]).toMatchObject({ minutes: '0.5', distance: '1' });
  expect(newRecords(strength('2', '5', '10'), [strength('1', '0', '10')]).map(record => record.label)).toEqual(['Heaviest set · 5 lb']);
});
