import { Workout } from '../workout';

// Calendar days in the user's local time, not UTC days or a streak.
export function trainingDays(history: Workout[]): number {
  const days = history.map(workout => new Date(workout.date))
    .filter(date => Number.isFinite(date.getTime()))
    .map(date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  return new Set(days).size;
}

export function completedEntries(workout: Workout): number {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.filter(set => {
    const positive = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
    return exercise.type === 'cardio'
      ? positive(set.minutes)
      : positive(set.reps) && set.weight.trim() !== '' && Number.isFinite(Number(set.weight)) && Number(set.weight) >= 0;
  }).length, 0);
}

export function sessionSummary(workout: Workout): string {
  const entries = completedEntries(workout);
  const exercises = workout.exercises.length;
  return `${exercises} ${exercises === 1 ? 'exercise' : 'exercises'} · ${entries} ${entries === 1 ? 'entry' : 'entries'} logged`;
}
