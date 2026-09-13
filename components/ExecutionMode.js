import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, spacing, type } from '../theme';

export const MODES = [
  { id: 'guide', label: 'Guide me', detail: 'Explain the steps. I’ll do them.' },
  { id: 'together', label: 'Do it with me', detail: 'Ask before each browser action.' },
  { id: 'aide', label: 'Aide me', detail: 'Navigate for me. Ask before clicks and typing.' },
  { id: 'full', label: 'Full Access', detail: 'Handle the whole task. No approval prompts.' },
];

export default function ExecutionMode({ mode, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = MODES.find((item) => item.id === mode);
  return <View style={styles.wrap}>
    {open && <View style={styles.menu}>
      <Text style={styles.heading}>How would you like help?</Text>
      {MODES.map((item) => <Pressable key={item.id} disabled={disabled}
        accessibilityRole="radio" accessibilityState={{ checked: item.id === mode, disabled }}
        onPress={() => { onChange(item.id); setOpen(false); }}
        style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}>
        <View style={styles.copy}><Text style={styles.label}>{item.label}</Text><Text style={styles.detail}>{item.detail}</Text></View>
        {item.id === mode && <Icon name="check" size={16} color={colors.ink} />}
      </Pressable>)}
      <Text style={styles.note}>Changing modes starts a fresh chat.</Text>
    </View>}
    <Pressable disabled={disabled} onPress={() => setOpen(!open)}
      accessibilityRole="button" accessibilityState={{ expanded: open, disabled }}
      style={[styles.trigger, disabled && { opacity: 0.5 }]}>
      <Icon name="audit" size={14} color={colors.inkMuted} />
      <Text style={styles.triggerText}>{selected.label}</Text>
      <Icon name={open ? 'voteUp' : 'down'} size={10} color={colors.inkMuted} />
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { gap: spacing(1) },
  trigger: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing(0.75), paddingVertical: spacing(1), paddingHorizontal: spacing(1) },
  triggerText: { ...type.label, color: colors.inkMuted },
  menu: { borderRadius: 20, backgroundColor: colors.surface, padding: spacing(2), borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  heading: { ...type.label, color: colors.inkMuted, marginBottom: spacing(1) },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(1.5), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  copy: { flex: 1, gap: 3 }, label: { ...type.bodyMedium, color: colors.ink },
  detail: { ...type.footnote, color: colors.inkMuted },
  note: { ...type.caption, color: colors.inkMuted, marginTop: spacing(1.5) },
});
