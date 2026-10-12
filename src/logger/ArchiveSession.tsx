import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Workout } from '../workout';
import { PersonalRecord, recordsForSet } from './records';
import { Action, C, S } from './ui';

type Props = { session: Workout; records: PersonalRecord[]; onEdit: () => void; onDelete: () => void; disabled: boolean };

export function ArchiveSession({ session, records, onEdit, onDelete, disabled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(session.date).toLocaleDateString();
  return <View style={S.card}>
    <Pressable testID={`archive-session-${session.id}`} accessibilityRole="button"
      accessibilityLabel={`${session.name}, ${date}${records.length ? `, ${records.length} personal ${records.length === 1 ? 'best' : 'bests'}` : ''}`}
      accessibilityState={{ expanded, disabled }} accessibilityHint={expanded ? 'Collapse workout details' : 'Expand workout details'}
      disabled={disabled} onPress={() => setExpanded(value => !value)} style={({ pressed }) => [{ paddingVertical: 7 }, pressed && { opacity: 0.65 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={S.subtitle}>{session.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Text style={S.muted}>{date}</Text>
            {records.length > 0 && <Text style={{ color: C.gold, fontSize: 17, letterSpacing: 3 }}>***</Text>}
          </View>
        </View>
        <Text style={{ color: C.muted, fontSize: 24 }}>{expanded ? '−' : '+'}</Text>
      </View>
    </Pressable>
    {expanded && <>
      {session.exercises.map((exercise, i) => <View key={i} style={{ marginTop: 12 }}>
        <Text style={S.text}>{exercise.name}</Text>
        {exercise.sets.map((set, j) => <View key={j} style={{ marginTop: 8 }}>
          <Text style={S.muted}>{exercise.type === 'strength' ? `${set.weight} lb × ${set.reps}` : `${set.minutes} min${set.distance ? ` / ${set.distance} mi` : ''}`}</Text>
          {recordsForSet(records, session.id, i, j).map(record => <Text key={record.key} style={S.badge}>PERSONAL BEST · {record.label}</Text>)}
        </View>)}
      </View>)}
      <Action label="EDIT SESSION" accessibilityLabel={`Edit session ${session.name} on ${date}`} onPress={onEdit} disabled={disabled}/>
      <Action label="DELETE SESSION" onPress={onDelete} disabled={disabled}/>
    </>}
  </View>;
}
