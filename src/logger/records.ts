import { Workout } from '../workout';
import { completeEntry, exerciseKey, numberValue } from './workouts';

export type PersonalRecord = {
  key: string; value: number; label: string; exerciseName: string;
  workoutId: string; exerciseIndex: number; setIndex: number;
};
export type RecordBook = Map<string, PersonalRecord>;

function candidates(workout: Workout): PersonalRecord[] {
  const result: PersonalRecord[] = [];
  workout.exercises.forEach((exercise, exerciseIndex) => exercise.sets.forEach((set, setIndex) => {
    if (!exercise.name.trim() || !completeEntry(exercise, set)) return;
    const add = (metric: string, value: number, label: string) => result.push({
      key: JSON.stringify([exerciseKey(exercise), metric]), value, label,
      exerciseName: exercise.name.trim(), workoutId: workout.id, exerciseIndex, setIndex,
    });
    if (exercise.type === 'strength') {
      const weight = numberValue(set.weight)!, reps = numberValue(set.reps)!;
      add('weight', weight, `Heaviest set · ${weight} lb`);
      add(`reps:${weight}`, reps, `Most reps at ${weight} lb · ${reps}`);
    } else {
      const minutes = numberValue(set.minutes)!, distance = numberValue(set.distance);
      add('duration', minutes, `Longest interval · ${minutes} min`);
      if (distance !== null && distance > 0) add('distance', distance, `Farthest interval · ${distance} mi`);
    }
  }));
  return result;
}

export function recordBook(history: Workout[]): RecordBook {
  const book: RecordBook = new Map();
  // On ties retain the earliest achievement, then the first matching set.
  const chronological = [...history].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const workout of chronological) for (const candidate of candidates(workout)) {
    const previous = book.get(candidate.key);
    if (!previous || candidate.value > previous.value) book.set(candidate.key, candidate);
  }
  return book;
}

export function newRecords(workout: Workout, history: Workout[]): PersonalRecord[] {
  const previous = recordBook(history);
  return [...recordBook([workout]).values()].filter(candidate => {
    const best = previous.get(candidate.key);
    // First entries establish a baseline. Ties are not new records. Including
    // the original saved session prevents unchanged edits announcing a PR.
    return best !== undefined && candidate.value > best.value;
  });
}

export function recordsForSet(records: Iterable<PersonalRecord>, workoutId: string, exerciseIndex: number, setIndex: number) {
  return [...records].filter(record => record.workoutId === workoutId && record.exerciseIndex === exerciseIndex && record.setIndex === setIndex);
}
