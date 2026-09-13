import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from './Icon';
import { colors, spacing, radii, type, cardShadow } from '../theme';

export default function PromptBar({ onSubmit, editable = true }) {
  const [value, setValue] = useState('');
  const canSend = editable && value.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSubmit?.(value.trim());
    setValue('');
  };

  return (
    <View style={styles.bar}>
      <Pressable style={styles.iconBtn} hitSlop={8}>
        <Icon name="attach" size={19} color={colors.inkMuted} />
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Message Axl"
        placeholderTextColor={colors.inkMuted}
        value={value}
        onChangeText={setValue}
        editable={editable}
        onSubmitEditing={send}
        returnKeyType="send"
        submitBehavior="submit"
        multiline
        keyboardAppearance="light"
      />

      {/* One round accent button: mic until there is something to send. */}
      <Pressable style={styles.action} hitSlop={8} onPress={send}>
        <Icon name={canSend ? 'send' : 'mic'} size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing(0.75),
    paddingLeft: spacing(1.75),
    paddingRight: spacing(0.75),
    ...cardShadow,
  },
  iconBtn: { height: 40, justifyContent: 'center' },
  input: { flex: 1, maxHeight: 120, paddingTop: 10, paddingBottom: 10, ...type.body, color: colors.ink },
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
});
