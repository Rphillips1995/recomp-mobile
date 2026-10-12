import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Workout } from '../workout';
import { sessionSummary, trainingDays } from './summary';

type Props = {
  history: Workout[];
  workout: Workout | null;
  onTrain: () => void;
  onArchive: () => void;
};

const ink = '#E8E4DC';
const muted = '#969997';
const gold = '#AC9471';
const line = '#2C2E2E';
const serif = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export function RecordScreen({ history, workout, onTrain, onArchive }: Props) {
  const latest = history[0];
  const days = trainingDays(history);
  const date = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <View style={styles.page}>
      <View style={styles.masthead}>
        <Text style={styles.eyebrow}>A PERSONAL JOURNAL</Text>
        <Text style={styles.date}>{date.toUpperCase()}</Text>
      </View>

      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.title}>The Record</Text>
        <Text style={styles.manifesto}>Time passes.{ '\n' }The work remains.</Text>
        <View style={styles.accent} />
      </View>

      <View style={styles.statistics}>
        <View style={styles.stat} accessible accessibilityLabel={`${history.length} ${history.length === 1 ? 'session' : 'sessions'} recorded`}>
          <Text style={styles.number}>{String(history.length).padStart(3, '0')}</Text>
          <Text style={styles.eyebrow}>SESSIONS RECORDED</Text>
        </View>
        <View style={[styles.stat, styles.secondStat]} accessible accessibilityLabel={`${days} training ${days === 1 ? 'day' : 'days'}`}>
          <Text style={styles.number}>{String(days).padStart(3, '0')}</Text>
          <Text style={styles.eyebrow}>TRAINING DAYS</Text>
        </View>
      </View>

      <View style={styles.training}>
        <Text style={styles.eyebrow}>{workout ? 'SESSION IN PROGRESS' : 'THE NEXT ENTRY'}</Text>
        <Text style={styles.invitation}>{workout ? 'Finish what you began.' : history.length ? 'Return to the work.' : 'Begin where you are.'}</Text>
        <Text style={styles.description}>{workout ? workout.name : 'No audience. No shortcuts. Just the work.'}</Text>
        <Pressable accessibilityRole="button" onPress={onTrain} style={({ pressed }) => [styles.trainButton, pressed && styles.pressed]}>
          <Text style={styles.trainLabel}>{workout ? 'CONTINUE TRAINING  →' : 'BEGIN TRAINING  →'}</Text>
        </Pressable>
      </View>

      <View style={styles.latest}>
        <View style={styles.sectionHeading}>
          <Text style={styles.eyebrow}>LAST RECORDED</Text>
          <Text style={styles.entryNumber}>{latest ? `NO. ${String(history.length).padStart(3, '0')}` : '—'}</Text>
        </View>
        {latest ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`View archive. Latest session: ${latest.name}`} onPress={onArchive} style={({ pressed }) => [styles.latestLink, pressed && styles.pressed]}>
            <Text style={styles.sessionDate}>{new Date(latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</Text>
            <Text style={styles.sessionName}>{latest.name}</Text>
            <Text style={styles.description}>{sessionSummary(latest)}</Text>
            <Text style={styles.archiveLink}>OPEN THE ARCHIVE  ↗</Text>
          </Pressable>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>A record begins with a single act.</Text>
            <Text style={styles.description}>Your completed sessions will live here.</Text>
          </View>
        )}
      </View>

      <View style={styles.colophon}>
        <Text style={styles.colophonMark}>R /</Text>
        <Text style={styles.colophonText}>BUILT IN PRIVATE. CARRIED INTO LIFE.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 12 },
  masthead: { gap: 8 },
  eyebrow: { color: muted, fontSize: 9, lineHeight: 15, letterSpacing: 1.7 },
  date: { color: gold, fontSize: 9, lineHeight: 15, letterSpacing: 1.4 },
  hero: { paddingTop: 30, paddingBottom: 30 },
  title: { color: ink, fontFamily: serif, fontSize: 46, lineHeight: 56, letterSpacing: -1.5 },
  manifesto: { color: muted, fontFamily: serif, fontSize: 19, lineHeight: 29, marginTop: 16 },
  accent: { backgroundColor: gold, width: 30, height: 1, marginTop: 26 },
  statistics: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: line, paddingVertical: 23 },
  stat: { flex: 1, gap: 7 },
  secondStat: { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: line, paddingLeft: 24 },
  number: { color: ink, fontSize: 44, lineHeight: 52, fontWeight: '200', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  training: { paddingTop: 29, paddingBottom: 30 },
  invitation: { color: ink, fontFamily: serif, fontSize: 25, lineHeight: 34, marginTop: 12 },
  description: { color: muted, fontSize: 13, lineHeight: 21, marginTop: 8 },
  trainButton: { backgroundColor: '#AD9775', minHeight: 54, justifyContent: 'center', alignItems: 'center', paddingVertical: 17, paddingHorizontal: 18, marginTop: 23 },
  trainLabel: { color: '#0B0C0D', fontSize: 11, lineHeight: 18, fontWeight: '600', letterSpacing: 1.8, textAlign: 'center' },
  pressed: { opacity: 0.65 },
  latest: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: line, paddingTop: 22 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  entryNumber: { color: gold, fontSize: 9, lineHeight: 15, letterSpacing: 1.6, fontVariant: ['tabular-nums'] },
  latestLink: { paddingTop: 21, paddingBottom: 10 },
  sessionDate: { color: muted, fontSize: 10, lineHeight: 16, letterSpacing: 1.2 },
  sessionName: { color: ink, fontFamily: serif, fontSize: 23, lineHeight: 32, marginTop: 8 },
  archiveLink: { color: gold, fontSize: 10, lineHeight: 17, letterSpacing: 1.5, marginTop: 19 },
  empty: { paddingVertical: 24 },
  emptyTitle: { color: ink, fontFamily: serif, fontSize: 20, lineHeight: 29 },
  colophon: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: line, marginTop: 24, paddingTop: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
  colophonMark: { color: gold, fontFamily: serif, fontSize: 21 },
  colophonText: { color: muted, fontSize: 8, lineHeight: 15, letterSpacing: 1.1, flexShrink: 1 },
});
