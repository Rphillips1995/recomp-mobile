import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export const C = { bg: '#0B0C0D', panel: '#151819', line: '#2C2E2E', ink: '#E8E4DC', muted: '#A3ADB7', gold: '#AC9471' };
export function Action({ label, onPress, primary = false, disabled = false, accessibilityLabel }: {
  label: string; onPress: () => void; primary?: boolean; disabled?: boolean; accessibilityLabel?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [S.button, primary && S.primary, (pressed || disabled) && { opacity: 0.5 }]}>
    <Text style={[S.buttonText, primary && { color: C.bg }]}>{label}</Text>
  </Pressable>;
}
export const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { padding: 22, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: C.ink, fontSize: 20, letterSpacing: 5, fontWeight: '300' },
  eyebrow: { color: C.muted, fontSize: 10, lineHeight: 17, letterSpacing: 1.4 },
  content: { padding: 22, paddingBottom: 65 }, recordContent: { paddingHorizontal: 28, paddingBottom: 36 },
  title: { fontSize: 34, color: C.ink, fontWeight: '300', marginVertical: 14 },
  card: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 20, marginVertical: 9, gap: 10 },
  subtitle: { color: C.ink, fontSize: 21, lineHeight: 29, fontWeight: '400' },
  text: { color: C.ink, lineHeight: 22 }, muted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  button: { borderWidth: 1, borderColor: C.line, padding: 13, marginTop: 8, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: C.gold, borderColor: C.gold },
  buttonText: { color: C.ink, fontSize: 11, lineHeight: 18, letterSpacing: 1, fontWeight: '600', textAlign: 'center' },
  input: { color: C.ink, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, padding: 14, minHeight: 48, marginVertical: 8 },
  smallInput: { color: C.ink, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, padding: 12, minHeight: 48, flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  field: { flex: 1, gap: 5 },
  removeSet: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  badge: { color: C.gold, fontSize: 11, lineHeight: 18, marginTop: 5 },
  notice: { borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 14, paddingVertical: 6, marginBottom: 14 },
  nav: { borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', padding: 12 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: 8 },
});
