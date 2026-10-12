import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Entry, Exercise, Workout } from '../workout';
import { emptyEntry, exerciseKey } from './workouts';
import { newRecords, recordsForSet } from './records';
import { Action, C, S } from './ui';

type Props = { workout: Workout; history: Workout[]; onChange: (workout: Workout) => void; onSave: () => void; onCancel: () => void; editing?: boolean; busy: boolean };

export function WorkoutEditor({ workout, history, onChange, onSave, onCancel, editing = false, busy }: Props) {
  const [exerciseName, setExerciseName] = useState('');
  const [kind, setKind] = useState<Exercise['type']>('strength');
  const [removed, setRemoved] = useState<{ exerciseIndex: number; setIndex: number; entry: Entry } | null>(null);
  const records = useMemo(() => newRecords(workout, history), [workout, history]);
  const exerciseChange = (index: number, fn: (exercise: Exercise) => Exercise) => onChange({
    ...workout, exercises: workout.exercises.map((exercise, i) => i === index ? fn(exercise) : exercise),
  });
  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setRemoved({ exerciseIndex, setIndex, entry: { ...workout.exercises[exerciseIndex].sets[setIndex] } });
    exerciseChange(exerciseIndex, exercise => ({ ...exercise, sets: exercise.sets.filter((_, i) => i !== setIndex) }));
  };
  const undo = () => {
    if (!removed) return;
    exerciseChange(removed.exerciseIndex, exercise => {
      const sets = [...exercise.sets];
      sets.splice(removed.setIndex, 0, removed.entry);
      return { ...exercise, sets };
    });
    setRemoved(null);
  };
  return <>
    {editing && <View style={S.notice}><Text style={S.muted}>Editing {new Date(workout.date).toLocaleDateString()}. Changes apply only when you save.</Text></View>}
    <Text style={S.eyebrow}>SESSION NAME</Text>
    <TextInput style={S.input} accessibilityLabel="Workout name" editable={!busy} value={workout.name} onChangeText={name => onChange({ ...workout, name })} />
    {removed && <View style={S.notice}><Text style={S.muted} accessibilityLiveRegion="polite">Set or interval removed.</Text><Action label="UNDO REMOVE" onPress={undo} disabled={busy}/></View>}
    {workout.exercises.map((exercise, i) => {
      const previous = history.filter(session => session.id !== workout.id).flatMap(session => session.exercises).find(saved => exerciseKey(saved) === exerciseKey(exercise));
      return <View key={i} style={S.card}>
        <Text style={S.eyebrow}>{exercise.type === 'strength' ? 'STRENGTH / LB' : 'CARDIO / MIN & MI'}</Text>
        <TextInput style={[S.input, S.subtitle]} accessibilityLabel={`Exercise ${i + 1} name`} value={exercise.name} editable={!busy}
          onChangeText={name => exerciseChange(i, value => ({ ...value, name }))}/>
        {previous && <><Text style={S.muted}>Last saved: {previous.sets.map(set => exercise.type === 'strength' ? `${set.weight} lb × ${set.reps}` : `${set.minutes} min${set.distance ? ` / ${set.distance} mi` : ''}`).join(' · ')}</Text>
          <Action label="USE PREVIOUS VALUES" disabled={busy} onPress={() => {
            setRemoved(null); exerciseChange(i, value => ({ ...value, sets: previous.sets.map(set => ({ ...set })) }));
          }}/></>}
        {!exercise.sets.length && <Text style={S.muted}>No sets yet. Add one below or undo the removal.</Text>}
        {exercise.sets.map((set, j) => <View key={j}>
          <View style={S.row}>
            <Text style={S.muted}>{String(j + 1).padStart(2, '0')}</Text>
            {(exercise.type === 'strength' ? ['weight', 'reps'] as const : ['minutes', 'distance'] as const).map(key => <View key={key} style={S.field}>
              <Text style={S.eyebrow}>{key === 'weight' ? 'LB' : key === 'distance' ? 'MI (OPTIONAL)' : key.toUpperCase()}</Text>
              <TextInput accessibilityLabel={`${exercise.name} ${key} set ${j + 1}`} style={S.smallInput} editable={!busy}
                keyboardType={key === 'reps' ? 'number-pad' : 'decimal-pad'} placeholder="—" placeholderTextColor={C.muted} value={set[key]}
                onChangeText={value => exerciseChange(i, entry => ({ ...entry, sets: entry.sets.map((s, k) => k === j ? { ...s, [key]: value } : s) }))}/>
            </View>)}
            <Pressable style={S.removeSet} accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name} ${exercise.type === 'strength' ? 'set' : 'interval'} ${j + 1}`}
              disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => removeSet(i, j)}><Text style={{ color: C.muted, fontSize: 24 }}>×</Text></Pressable>
          </View>
          {recordsForSet(records, workout.id, i, j).map(record => <Text key={record.key} style={S.badge}>PR IF SAVED · {record.label}</Text>)}
        </View>)}
        <Action label="+ ADD SET / INTERVAL" disabled={busy} onPress={() => exerciseChange(i, value => ({ ...value, sets: [...value.sets, emptyEntry()] }))}/>
        <Action label="REMOVE EXERCISE" accessibilityLabel={`Remove exercise ${i + 1}: ${exercise.name}`} disabled={busy} onPress={() => {
          setRemoved(null); onChange({ ...workout, exercises: workout.exercises.filter((_, index) => index !== i) });
        }}/>
      </View>;
    })}
    <View style={S.card}>
      <Text style={S.eyebrow}>ADD EXERCISE</Text>
      <View style={S.row}><View style={{ flex: 1 }}><Action label="STRENGTH" onPress={() => setKind('strength')} primary={kind === 'strength'} disabled={busy}/></View>
        <View style={{ flex: 1 }}><Action label="CARDIO" onPress={() => setKind('cardio')} primary={kind === 'cardio'} disabled={busy}/></View></View>
      <TextInput style={S.input} accessibilityLabel="New exercise name" placeholder="Exercise name" placeholderTextColor={C.muted} value={exerciseName} editable={!busy} onChangeText={setExerciseName}/>
      <Action label="+ ADD EXERCISE" disabled={busy || !exerciseName.trim()} onPress={() => {
        if (!exerciseName.trim()) return;
        onChange({ ...workout, exercises: [...workout.exercises, { name: exerciseName.trim(), type: kind, sets: [emptyEntry()] }] }); setExerciseName('');
      }}/>
    </View>
    <Text style={S.muted}>Blank rows are left out when you save. Gold PR markers compare against your saved history.</Text>
    <Action label={busy ? 'SAVING…' : editing ? 'SAVE CHANGES  →' : 'COMPLETE SESSION  →'} onPress={onSave} primary disabled={busy}/>
    <Action label={editing ? 'CANCEL EDITING' : 'DISCARD SESSION'} onPress={onCancel} disabled={busy}/>
  </>;
}
