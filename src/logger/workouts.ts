import { Entry, Exercise, Workout } from '../workout';

export const emptyEntry = (): Entry => ({ weight: '', reps: '', minutes: '', distance: '' });
export const exerciseKey = (exercise: Exercise) => `${exercise.type}:${exercise.name.trim().replace(/\s+/g, ' ').toLowerCase()}`;
export const cloneWorkout = (workout: Workout): Workout => ({
  ...workout, exercises: workout.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set })) })),
});

export function numberValue(text: string): number | null {
  const trimmed = text.trim();
  // Accept decimal commas from locale-specific number pads, but not exponents.
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function completeEntry(exercise: Exercise, set: Entry): boolean {
  if (exercise.type === 'strength') {
    const weight = numberValue(set.weight), reps = numberValue(set.reps);
    return weight !== null && weight >= 0 && reps !== null && reps > 0 && Number.isInteger(reps);
  }
  const minutes = numberValue(set.minutes), distance = numberValue(set.distance);
  return minutes !== null && minutes > 0 && (!set.distance.trim() || (distance !== null && distance >= 0));
}

export function prepareWorkout(workout: Workout): { workout: Workout; error?: never } | { error: string; workout?: never } {
  const exercises: Exercise[] = [];
  for (const exercise of workout.exercises) {
    const keys: (keyof Entry)[] = exercise.type === 'strength' ? ['weight', 'reps'] : ['minutes', 'distance'];
    const sets: Entry[] = [];
    for (const [index, set] of exercise.sets.entries()) {
      if (keys.every(key => !set[key].trim())) continue;
      if (!exercise.name.trim()) return { error: 'Give each exercise a name.' };
      if (!completeEntry(exercise, set)) return { error: `${exercise.name.trim()}, ${exercise.type === 'strength' ? 'set' : 'interval'} ${index + 1}: ${exercise.type === 'strength' ? 'enter a nonnegative weight and a positive whole number of reps.' : 'enter positive minutes and, optionally, a nonnegative distance.'}` };
      const cleaned = emptyEntry();
      for (const key of keys) cleaned[key] = set[key].trim() ? String(numberValue(set[key])) : '';
      sets.push(cleaned);
    }
    if (sets.length) exercises.push({ ...exercise, name: exercise.name.trim(), sets });
  }
  if (!exercises.length) return { error: 'Enter at least one completed set or cardio interval.' };
  return { workout: { ...workout, name: workout.name.trim() || 'Training Session', exercises } };
}
