import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrowserViewport from './BrowserViewport';
import Icon from './Icon';
import { colors, spacing, type } from '../theme';

export default function AgentBrowser({ session, onApprove, onStop }) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  if (!session?.live_url && !session?.pending && !session?.error) return null;
  const approval = session.pending;
  const respond = async (allow) => {
    setAnswering(true); setError(null);
    try { await onApprove(approval.id, allow); }
    catch (e) { setError(e.message); }
    finally { setAnswering(false); }
  };
  let domain = 'Browser';
  try { domain = new URL(session.url).hostname || 'Browser'; } catch {}
  const header = <View style={styles.chrome}>
    <View style={styles.dot} /><Text numberOfLines={1} style={styles.address}>{domain}</Text>
    <Pressable onPress={() => setExpanded(!expanded)} hitSlop={10} accessibilityRole="button" accessibilityLabel={expanded ? 'Minimize browser' : 'Expand browser'}>
      <Icon name={expanded ? 'down' : 'square.grid.2x2'} size={16} color={colors.inkMuted} />
    </Pressable>
  </View>;
  const view = <View style={[styles.viewport, expanded ? styles.expandedViewport : { height: Math.min(windowHeight * 0.7, 620) }]}>
    {session.live_url && !failed ? <BrowserViewport url={session.live_url} onError={() => setFailed(true)} />
      : <View style={styles.empty}><Text style={styles.detail}>{failed ? 'The embedded viewer could not load.' : 'Your browser will appear here.'}</Text></View>}
  </View>;
  const approvalView = approval && <View style={styles.approval}>
    <Text style={styles.kicker}>Your permission</Text>
    <Text style={styles.title}>{approval.label}</Text>
    <Text numberOfLines={2} style={styles.detail}>{approval.detail}</Text>
    {!!approval.target && <Text style={styles.detail}>{approval.target}</Text>}
    {!!approval.text && <Text numberOfLines={3} style={styles.detail}>“{approval.text}”</Text>}
    <View style={styles.actions}>
      <Pressable disabled={answering} onPress={() => respond(false)} style={styles.secondary}><Text style={styles.buttonText}>Skip</Text></Pressable>
      <Pressable disabled={answering} onPress={() => respond(true)} style={[styles.primary, answering && { opacity: 0.5 }]}><Text style={styles.primaryText}>{answering ? 'One moment…' : 'Allow once'}</Text></Pressable>
    </View>
  </View>;
  const footer = <View style={styles.footer}>
    <Text style={styles.caption}>Live browser · you can take over</Text>
    {!expanded && session.live_url && <Pressable onPress={() => setExpanded(true)}><Text style={styles.link}>Expand</Text></Pressable>}
    {expanded && session.live_url && <Pressable onPress={() => Linking.openURL(session.live_url)}><Text style={styles.link}>Safari</Text></Pressable>}
    <Pressable onPress={onStop}><Text style={styles.link}>Stop</Text></Pressable>
  </View>;
  return <View style={styles.wrap}>
    {!expanded && <View style={styles.window}>{header}{session.live_url && view}{approvalView}{footer}</View>}
    <Modal visible={expanded} presentationStyle="fullScreen" animationType="slide" onRequestClose={() => setExpanded(false)}>
      <View style={[styles.full, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>{header}{view}{approvalView}{footer}</View>
    </Modal>
    {!!(error || session.error) && <Text style={styles.detail}>{error || session.error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginVertical: spacing(1.5), gap: spacing(1) },
  window: { overflow: 'hidden', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  chrome: { height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: spacing(1.5), backgroundColor: '#F3F2EE' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkMuted },
  address: { ...type.caption, color: colors.inkMuted, flex: 1 },
  viewport: { backgroundColor: colors.surface, overflow: 'hidden' },
  expandedViewport: { flex: 1, minHeight: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(2) },
  full: { flex: 1, backgroundColor: colors.bg },
  approval: { padding: spacing(2), gap: spacing(0.75), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  kicker: { ...type.caption, color: colors.inkMuted }, title: { ...type.bodyMedium, color: colors.ink }, detail: { ...type.footnote, color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: spacing(1), justifyContent: 'flex-end', marginTop: spacing(1) },
  primary: { backgroundColor: colors.ink, borderRadius: 22, paddingHorizontal: spacing(2), paddingVertical: spacing(1.25) },
  secondary: { borderRadius: 22, paddingHorizontal: spacing(2), paddingVertical: spacing(1.25), backgroundColor: '#F3F2EE' },
  primaryText: { ...type.label, color: colors.surface }, buttonText: { ...type.label, color: colors.ink },
  footer: { flexDirection: 'row', gap: spacing(1.5), alignItems: 'center', padding: spacing(1.5) },
  caption: { ...type.caption, color: colors.inkMuted, flex: 1 }, link: { ...type.label, color: colors.inkMuted },
});
