import { useEffect, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, accents, spacing, radii, type } from '../theme';
import { CLINICIANS } from '../data/days';
import Icon from './Icon';
import BlobMark from './BlobMark';

// Sending a day is not a share sheet. The person needs to see exactly what
// leaves — which days, which flagged lines inside them — before it goes, which
// is the whole reason the log is audited in the first place.

const FLAG_TINT = { gold: accents.gold, blue: accents.blue, green: accents.green, purple: accents.purple };

export default function ClinicianSheet({ visible, days, preselect, onClose, onSend }) {
  const insets = useSafeAreaInsets();
  const [to, setTo] = useState(CLINICIANS[0].id);
  const [picked, setPicked] = useState([]);
  const [notes, setNotes] = useState('');

  // Opening from a day's row means that day is the subject; opening from the
  // footer means today is, because that is the one someone is usually sending.
  useEffect(() => {
    if (!visible) return;
    setPicked([(preselect ?? days[0])?.id].filter(Boolean));
    setNotes('');
  }, [visible, preselect]);

  const toggle = (id) => {
    Haptics.selectionAsync();
    setPicked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const chosen = days.filter((d) => picked.includes(d.id));
  const flags = chosen.flatMap((d) => d.flags);

  const send = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSend({ clinicianId: to, dayIds: picked, notes: notes.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView style={styles.lift} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing(1.5) }]}>
            <View style={styles.grabber} />

            <View style={styles.head}>
              <Text style={styles.title}>Send to clinician</Text>
              <Pressable hitSlop={10} onPress={onClose}>
                <Icon name="clear" size={20} color={colors.inkMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardDismissMode="on-drag">
              <Text style={styles.label}>Recipient</Text>
              <View style={styles.group}>
                {CLINICIANS.map((c) => {
                  const on = c.id === to;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTo(c.id);
                      }}
                      style={[styles.pick, on && styles.pickOn]}
                    >
                      <View style={styles.pickText}>
                        <Text style={styles.pickName}>{c.name}</Text>
                        <Text style={styles.pickRole}>{c.role}</Text>
                      </View>
                      {on && <Icon name="check" size={15} color={colors.ink} />}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Days ({picked.length})</Text>
              <View style={styles.group}>
                {days.map((d) => {
                  const on = picked.includes(d.id);
                  return (
                    <Pressable key={d.id} onPress={() => toggle(d.id)} style={[styles.pick, on && styles.pickOn]}>
                      <View style={[styles.box, on && styles.boxOn]}>
                        {on && <Icon name="check" size={11} color="#fff" />}
                      </View>
                      <View style={styles.pickText}>
                        <Text style={styles.pickName} numberOfLines={1}>{d.title}</Text>
                        <Text style={styles.pickRole}>
                          {d.date} · {d.flags.length} flagged{d.sent ? ' · sent before' : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {flags.length > 0 && (
                <>
                  <Text style={styles.label}>What they will see first</Text>
                  <View style={styles.flags}>
                    {flags.map((f, i) => (
                      <View key={i} style={styles.flag}>
                        <BlobMark seed={f.text} size={10} fill={FLAG_TINT[f.tone] ?? accents.blue} />
                        <Text style={styles.flagText}>{f.text}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Your note</Text>
              <TextInput
                style={styles.notes}
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything the transcript does not say — how a week felt, what you want asked at the next visit."
                placeholderTextColor={colors.inkMuted}
                multiline
                textAlignVertical="top"
                keyboardAppearance="light"
              />
            </ScrollView>

            <Pressable
              onPress={send}
              disabled={picked.length === 0}
              style={({ pressed }) => [
                styles.send,
                picked.length === 0 && styles.sendOff,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name="paperplane" size={15} color="#fff" />
              <Text style={styles.sendText}>
                Send {picked.length} {picked.length === 1 ? 'day' : 'days'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,21,21,0.28)' },
  // The sheet is height-bounded by its wrapper and the list inside it shrinks,
  // so a long day list scrolls instead of pushing the header off screen.
  lift: { maxHeight: '92%' },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1),
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing(1.5),
  },
  head: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing(1) },
  title: { flex: 1, ...type.heading, fontSize: 19, color: colors.ink },

  scroll: { flexShrink: 1 },
  body: { paddingBottom: spacing(2), gap: spacing(0.75) },
  label: { ...type.caption, color: colors.inkMuted, marginTop: spacing(1) },
  group: { backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },

  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.75),
  },
  pickOn: { backgroundColor: colors.page },
  pickText: { flex: 1, gap: 1 },
  pickName: { ...type.label, fontSize: 14, color: colors.ink },
  pickRole: { ...type.caption, color: colors.inkMuted },
  box: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },

  flags: { gap: spacing(0.75), paddingVertical: spacing(0.5) },
  flag: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  flagText: { flex: 1, ...type.footnote, color: colors.ink },

  notes: {
    minHeight: 92,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing(1.75),
    ...type.callout,
    color: colors.ink,
  },

  send: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    height: 50,
    marginTop: spacing(1),
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  sendOff: { opacity: 0.35 },
  sendText: { ...type.bodyMedium, fontSize: 15, color: '#fff' },
});
