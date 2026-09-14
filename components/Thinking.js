import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { colors, spacing, type } from '../theme';
import { toolPresentation } from '../lib/agent-events.mjs';

const STATUS = {
  running: 'Running', blocked: 'Blocked', failed: 'Failed',
  interrupted: 'Interrupted', unknown: 'Status unavailable',
};

export default function Thinking({ tools = [], done = false }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={`${done ? 'Activity' : 'Working'}, ${tools.length} tools`}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
      >
        <Text style={styles.title}>{done ? 'Activity' : 'Working'} <Text style={styles.count}>· {tools.length}</Text></Text>
        <Icon name={open ? 'down' : 'next'} size={11} color={colors.inkMuted} />
      </Pressable>
      {open && <View style={styles.steps}>
        {tools.map((tool, index) => {
          const { label, state } = toolPresentation(tool, done);
          return (
            <View key={tool.call_id} style={[styles.row, index > 0 && styles.divider]}
              accessibilityLabel={`${label}, ${state === 'completed' ? 'completed' : STATUS[state]}`}>
              <View style={styles.marker}>
                {state === 'running' ? <ActivityIndicator size="small" color={colors.inkMuted} />
                  : <Icon name={state === 'completed' ? 'check' : state === 'blocked' ? 'pause' : state === 'failed' ? 'clear' : 'history'}
                    size={13} color={colors.inkMuted} />}
              </View>
              <Text style={styles.name}>{label}</Text>
              {state !== 'completed' && <Text style={styles.status}>{STATUS[state]}</Text>}
            </View>
          );
        })}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: spacing(0.5), marginBottom: spacing(1), paddingLeft: spacing(0.5) },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(0.75), paddingVertical: spacing(0.5), alignSelf: 'flex-start' },
  pressed: { opacity: 0.55 },
  title: { ...type.label, color: colors.inkMuted },
  count: { ...type.footnote },
  steps: { paddingLeft: spacing(0.5) },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingVertical: spacing(1.25) },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  marker: { width: 16, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.footnote, color: colors.inkMuted, flex: 1 },
  status: { ...type.caption, color: colors.inkMuted, flexShrink: 1 },
});
