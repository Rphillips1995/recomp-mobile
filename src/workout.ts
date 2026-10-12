export type Entry = { weight: string; reps: string; minutes: string; distance: string };
export type Exercise = { name: string; type: 'strength' | 'cardio'; sets: Entry[] };
export type Workout = { id: string; date: string; name: string; exercises: Exercise[] };
