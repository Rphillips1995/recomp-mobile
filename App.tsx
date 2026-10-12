import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { OpeningSequence } from './src/opening/OpeningSequence';
import { hasCompletedOpening } from './src/opening/launch';
import { RecordScreen } from './src/record/RecordScreen';
import { Workout } from './src/workout';
import { WorkoutEditor } from './src/logger/WorkoutEditor';
import { ArchiveSession } from './src/logger/ArchiveSession';
import { cloneWorkout, prepareWorkout } from './src/logger/workouts';
import { newRecords, recordBook } from './src/logger/records';
import { Action, C, S } from './src/logger/ui';

export default function App() {
  const [showOpening, setShowOpening] = useState(() => !hasCompletedOpening());
  const finishOpening = useCallback(() => setShowOpening(false), []);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [tab, setTab] = useState<'record' | 'train' | 'archive'>('record');
  const [busy, setBusy] = useState(false);
  const mutationInFlight = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const bests = useMemo(() => recordBook(history), [history]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const database = await SQLite.openDatabaseAsync('recomp.db');
        await database.execAsync('CREATE TABLE IF NOT EXISTS workouts(id TEXT PRIMARY KEY,date TEXT NOT NULL,json TEXT NOT NULL)');
        const rows = await database.getAllAsync<{ json: string }>('SELECT json FROM workouts ORDER BY date DESC');
        if (live) { setHistory(rows.map(row => JSON.parse(row.json))); setDb(database); }
      } catch (error) { if (live) Alert.alert('Database error', String(error)); }
    })();
    return () => { live = false; };
  }, []);

  const navigate = (next: typeof tab) => { if (!mutationInFlight.current) { setTab(next); scroll.current?.scrollTo({ y: 0, animated: false }); } };
  const start = () => {
    if (!workout) setWorkout({ id: String(Date.now()), date: new Date().toISOString(), name: 'Training Session', exercises: [] });
    navigate('train');
  };
  const edit = (session: Workout) => { setEditing(cloneWorkout(session)); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const cancelEditing = () => {
    if (!editing || mutationInFlight.current) return;
    const close = () => { setEditing(null); scroll.current?.scrollTo({ y: 0, animated: false }); };
    if (JSON.stringify(editing) === JSON.stringify(history.find(session => session.id === editing.id))) close();
    else Alert.alert('Discard changes?', 'The saved session will stay as it was.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard changes', style: 'destructive', onPress: close },
    ]);
  };
  const save = async (draft: Workout, isEdit: boolean) => {
    if (!db || mutationInFlight.current) return;
    const prepared = prepareWorkout(draft);
    if (prepared.error) { Alert.alert('Check your session', prepared.error); return; }
    const saved = prepared.workout!;
    const records = newRecords(saved, history);
    mutationInFlight.current = true;
    setBusy(true);
    try {
      if (isEdit) {
        const result = await db.runAsync('UPDATE workouts SET json=? WHERE id=?', JSON.stringify(saved), saved.id);
        if (result.changes !== 1) throw new Error('This session is no longer in the archive. Your changes have not been saved.');
      } else {
        await db.runAsync('INSERT INTO workouts(id,date,json) VALUES(?,?,?)', saved.id, saved.date, JSON.stringify(saved));
      }
      // The write has succeeded. Update memory directly, so a failed follow-up
      // read can never leave a saved draft open and cause a duplicate insert.
      setHistory(current => [saved, ...current.filter(session => session.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)));
      if (isEdit) { setEditing(null); setTab('archive'); }
      else { setWorkout(null); setTab('record'); }
      scroll.current?.scrollTo({ y: 0, animated: false });
      const message = records.length ? `Personal record${records.length === 1 ? '' : 's'}:\n${records.map(record => `${record.exerciseName}: ${record.label}`).join('\n')}` : isEdit ? 'Your record has been updated.' : 'The work continues.';
      Alert.alert(isEdit ? 'Session updated' : 'Session recorded', message);
    } catch (error) { Alert.alert('Save failed', String(error)); }
    finally { mutationInFlight.current = false; setBusy(false); }
  };
  const remove = (id: string) => Alert.alert('Delete session?', 'This cannot be undone. Personal records will be recalculated.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      if (!db || mutationInFlight.current) return;
      mutationInFlight.current = true; setBusy(true);
      try { await db.runAsync('DELETE FROM workouts WHERE id=?', id); setHistory(current => current.filter(session => session.id !== id)); }
      catch (error) { Alert.alert('Delete failed', String(error)); }
      finally { mutationInFlight.current = false; setBusy(false); }
    } },
  ]);

  return <View style={S.root}>
    <StatusBar style="light"/>
    <SafeAreaView style={S.root} accessibilityElementsHidden={showOpening} importantForAccessibility={showOpening ? 'no-hide-descendants' : 'auto'} pointerEvents={showOpening ? 'none' : 'auto'}>
      <View style={S.header}><Text style={S.brand}>RECOMP</Text><Text style={S.eyebrow}>THE WORK CONTINUES.</Text></View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[S.content, tab === 'record' && S.recordContent]}>
          {tab === 'record' && <RecordScreen history={history} workout={workout} onTrain={start} onArchive={() => navigate('archive')}/>}
          {tab === 'train' && <>
            <Text style={S.eyebrow}>TRAINING / SESSION</Text><Text style={S.title}>The Work</Text>
            {!workout ? <Action label="BEGIN TRAINING  →" onPress={start}/> : <WorkoutEditor key={workout.id} workout={workout} history={history} onChange={setWorkout}
              onSave={() => save(workout, false)} busy={busy || !db} onCancel={() => Alert.alert('Discard session?', 'Unsaved work will be lost.', [
                { text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => setWorkout(null) },
              ])}/>}
          </>}
          {tab === 'archive' && <>
            <Text style={S.eyebrow}>{editing ? 'ARCHIVE / EDIT SESSION' : 'TRAINING HISTORY'}</Text><Text style={S.title}>{editing ? 'Revise the record.' : 'The Archive'}</Text>
            {editing ? <WorkoutEditor key={`edit:${editing.id}`} workout={editing} history={history} onChange={setEditing}
              onSave={() => save(editing, true)} onCancel={cancelEditing} editing busy={busy || !db}/> : <>
              <Text style={S.muted}>Your work, kept. Tap a session to open it.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="How personal records work" onPress={() => Alert.alert('Personal records', 'Gold asterisks mark a session with current personal bests. Expand it to see the details. Strength: heaviest set and most reps at the same weight. Cardio: longest interval by duration and distance. Records compare the same exercise name and type across your saved history. First entries establish a baseline; only improvements earn a new PR. On ties, the earliest achievement keeps its badge. Editing or deleting a session recalculates your bests.')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={S.badge}>HOW RECORDS WORK ↗</Text></Pressable>
              {history.length === 0 ? <Text style={[S.muted, { marginTop: 24 }]}>No sessions yet.</Text> : history.map(session => <ArchiveSession
                key={session.id} session={session} records={[...bests.values()].filter(record => record.workoutId === session.id)}
                onEdit={() => edit(session)} onDelete={() => remove(session.id)} disabled={busy || !db}/>)}
            </>}
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={S.nav}>{(['record', 'train', 'archive'] as const).map(next => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === next, disabled: busy }} key={next} style={S.navItem} disabled={busy} onPress={() => navigate(next)}>
        <Text style={[S.eyebrow, tab === next && { color: C.gold }]}>{next.toUpperCase()}</Text>
      </Pressable>)}</View>
    </SafeAreaView>
    {showOpening && <OpeningSequence onComplete={finishOpening}/>}
  </View>;
}
