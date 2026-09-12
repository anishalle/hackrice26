import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme';

export default function PromptBar() {
  const [value, setValue] = useState('');
  const canSend = value.trim().length > 0;

  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconBtn} hitSlop={8}>
        <Ionicons name="add" size={20} color={colors.inkMuted} />
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Message your agent"
        placeholderTextColor={colors.inkMuted}
        value={value}
        onChangeText={setValue}
      />

      <Pressable style={styles.iconBtn} hitSlop={8}>
        <Ionicons name="mic-outline" size={20} color={colors.inkMuted} />
      </Pressable>

      <Pressable style={[styles.sendBtn, canSend && styles.sendBtnActive]} hitSlop={8}>
        <Ionicons name="arrow-up" size={18} color={canSend ? '#fff' : colors.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  sendBtnActive: { backgroundColor: colors.ink },
});
