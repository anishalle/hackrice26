import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { colors, fonts, spacing, radii } from '../theme';

const ANSWER =
  "Pistachio is your fastest-growing flavor. Sales are up 23% this month and margins beat vanilla by 8 points.";
const SOURCES = ['Scoop Data', 'Trends Index', 'Market Basket'];
const FOLLOW_UPS = ['Which flavors sell best in winter', 'Compare gelato and soft serve margins'];

export default function StreamingText({ onComplete }) {
  const words = ANSWER.split(' ');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= words.length) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => setCount((c) => c + 1), 55);
    return () => clearTimeout(t);
  }, [count]);

  const done = count >= words.length;

  return (
    <View style={styles.card}>
      <Text style={styles.answer}>
        {words.slice(0, count).join(' ')}
        {!done && <Text style={styles.cursor}> ▍</Text>}
      </Text>

      {done && (
        <>
          <View style={styles.sourceRow}>
            {SOURCES.map((s) => (
              <View key={s} style={styles.sourceChip}>
                <Text style={styles.sourceChipText}>{s}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.followUpsLabel}>Follow-ups</Text>
          {FOLLOW_UPS.map((f) => (
            <Pressable key={f} style={styles.followUp}>
              <Text style={styles.followUpText}>{f}</Text>
              <CaretRight size={14} color={colors.inkMuted} />
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E9E9EB',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: spacing(2),
    gap: spacing(1.5),
  },
  answer: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 21, color: colors.ink },
  cursor: { color: colors.indigo },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(0.75) },
  sourceChip: { paddingVertical: spacing(0.5), paddingHorizontal: spacing(1.25), borderRadius: radii.pill, backgroundColor: '#fff' },
  sourceChipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted },
  followUpsLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, marginTop: spacing(0.5) },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(1),
    borderTopWidth: 1,
    borderTopColor: 'rgba(21,21,21,0.1)',
  },
  followUpText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink, flex: 1 },
});
