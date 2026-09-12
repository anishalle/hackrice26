import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Plus, Microphone, ArrowUp } from 'phosphor-react-native';
import { colors, spacing, radii, fonts } from '../theme';

export default function PromptBar({ onSubmit, editable = true }) {
  const [value, setValue] = useState('');
  const canSend = editable && value.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSubmit?.(value.trim());
    setValue('');
  };

  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconBtn} hitSlop={8}>
        <Plus size={20} color={colors.inkMuted} />
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Message your agent"
        placeholderTextColor={colors.inkMuted}
        value={value}
        onChangeText={setValue}
        editable={editable}
        onSubmitEditing={send}
        returnKeyType="send"
      />

      <Pressable style={styles.iconBtn} hitSlop={8}>
        <Microphone size={20} color={colors.inkMuted} />
      </Pressable>

      <Pressable style={[styles.sendBtn, canSend && styles.sendBtnActive]} hitSlop={8} onPress={send}>
        <ArrowUp size={18} color={canSend ? '#fff' : colors.inkMuted} />
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
