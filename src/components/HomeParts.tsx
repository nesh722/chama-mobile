import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const initials = (name: string) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const money = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

// ---------- Greeting avatar ----------
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary + '26', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

// ---------- Section header with optional action ----------
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {!!actionLabel && (
        <TouchableOpacity onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------- Hero card ----------
type HeroProps = { total: number; groupCount: number; activeLoans: number; owed: number; onPressLoans?: () => void };

export function HeroCard({ total, groupCount, activeLoans, owed, onPressLoans }: HeroProps) {
  const { colors } = useAppTheme();
  const [hidden, setHidden] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fade]);

  const onPrimary = colors.primaryText;
  const faint = onPrimary + 'b3';

  return (
    <Animated.View
      style={[
        styles.hero,
        {
          backgroundColor: colors.primary,
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }]
        }
      ]}
    >
      {/* decorative shapes */}
      <View style={[styles.blob, { width: 190, height: 190, borderRadius: 95, top: -70, right: -50, backgroundColor: onPrimary + '14' }]} />
      <View style={[styles.blob, { width: 120, height: 120, borderRadius: 60, bottom: -50, left: -30, backgroundColor: onPrimary + '10' }]} />

      <View style={styles.heroTop}>
        <Text style={{ color: faint, fontSize: 13, fontWeight: '600' }}>Total saved</Text>
        <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={faint} />
        </TouchableOpacity>
      </View>
      <Text style={{ color: onPrimary, fontSize: 32, fontWeight: '800', marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
        {hidden ? 'KES ••••••' : `KES ${money(total)}`}
      </Text>

      <View style={styles.heroStats}>
        <View style={[styles.heroPill, { backgroundColor: onPrimary + '22' }]}>
          <Ionicons name="people-outline" size={14} color={onPrimary} />
          <Text style={[styles.heroPillText, { color: onPrimary }]}>
            {groupCount} {groupCount === 1 ? 'group' : 'groups'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={onPressLoans ? 0.7 : 1}
          onPress={onPressLoans}
          style={[styles.heroPill, { backgroundColor: onPrimary + '22' }]}
        >
          <Ionicons name="cash-outline" size={14} color={onPrimary} />
          <Text style={[styles.heroPillText, { color: onPrimary }]}>
            {activeLoans} active {activeLoans === 1 ? 'loan' : 'loans'}
            {owed > 0 && !hidden ? ` · KES ${money(owed)} owed` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ---------- Quick actions ----------
export type QuickAction = { icon: string; label: string; color: string; onPress: () => void };

export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.actionsPanel, { backgroundColor: colors.surface }]}>
      {actions.map((a) => (
        <TouchableOpacity key={a.label} style={styles.actionItem} onPress={a.onPress} activeOpacity={0.7}>
          <View style={[styles.actionCircle, { backgroundColor: a.color + '24' }]}>
            <Ionicons name={a.icon as any} size={24} color={a.color} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={2}>
            {a.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ---------- Group savings carousel ----------
export type GroupSaving = {
  groupId?: number | string;
  name: string;
  total: number;
  contributions: number;
  extra: number;
  progress?: { pct: number; onTrack: boolean; shortfall?: number } | null;
};

export function GroupCarousel({ items, onPress }: { items: GroupSaving[]; onPress: (g: GroupSaving) => void }) {
  const { colors } = useAppTheme();
  const accents = [colors.primary, colors.success, '#8b5cf6', colors.warning, '#ec4899', '#06b6d4'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
      {items.map((g, i) => {
       const accent = accents[Math.abs(Number(g.groupId) || i) % accents.length];
        return (
          <TouchableOpacity
            key={`${g.name}-${i}`}
            activeOpacity={0.85}
            onPress={() => onPress(g)}
            style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: accent + '55' }]}
          >
            <View style={[styles.groupStripe, { backgroundColor: accent }]} />
            <View style={styles.groupHead}>
              <View style={[styles.groupAvatar, { backgroundColor: accent + '26' }]}>
                <Text style={{ color: accent, fontWeight: '800', fontSize: 13 }}>{initials(g.name)}</Text>
              </View>
              <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                {g.name}
              </Text>
            </View>
            <Text style={[styles.groupAmount, { color: colors.text }]}>KES {money(g.total)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {g.extra > 0 ? `${money(g.contributions)} contributions + ${money(g.extra)} extra` : 'Saved so far'}
            </Text>
            {g.progress ? (
              <View style={{ marginTop: 12 }}>
                <View style={[styles.track, { backgroundColor: colors.border }]}>
                  <View style={[styles.fill, { width: `${Math.max(4, Math.min(g.progress.pct, 100))}%`, backgroundColor: g.progress.onTrack ? colors.success : colors.danger }]} />
                </View>
                <Text style={{ marginTop: 5, fontSize: 11, fontWeight: '700', color: g.progress.onTrack ? colors.success : colors.danger }}>
                  {g.progress.onTrack ? 'ON TRACK' : `BEHIND KES ${money(g.progress.shortfall || 0)}`}
                </Text>
              </View>
            ) : (
              <Text style={{ marginTop: 12, fontSize: 11, fontWeight: '600', color: colors.textMuted }}>NO TARGET SET</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ---------- Next meeting card ----------
export type UpcomingMeeting = {
  id: number;
  groupId: number;
  groupName: string;
  title: string;
  meetingDate: string;
  venue: string | null;
  apologySent: boolean;
};

function whenLabel(d: string) {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date(d)) - start(new Date())) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function NextMeetingCard({ meetings, onPress }: { meetings: UpcomingMeeting[]; onPress: (m: UpcomingMeeting) => void }) {
  const { colors } = useAppTheme();
  if (meetings.length === 0) return null;
  const m = meetings[0];
  const purple = '#8b5cf6';
  const when = new Date(m.meetingDate).toLocaleString('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi'
  });
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(m)}
      style={[styles.meetingCard, { backgroundColor: colors.surface, borderLeftColor: purple }]}
    >
      <View style={[styles.meetingIcon, { backgroundColor: purple + '26' }]}>
        <Ionicons name="calendar-outline" size={22} color={purple} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: purple, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>NEXT MEETING</Text>
          <View style={[styles.whenChip, { backgroundColor: purple + '24' }]}>
            <Text style={{ color: purple, fontSize: 11, fontWeight: '700' }}>{whenLabel(m.meetingDate)}</Text>
          </View>
        </View>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
          {m.title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {m.groupName} · {when}
          {m.venue ? ` · ${m.venue}` : ''}
        </Text>
        {m.apologySent && <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '700', marginTop: 4 }}>APOLOGY SENT</Text>}
        {meetings.length > 1 && (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
            +{meetings.length - 1} more upcoming
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ---------- Group picker sheet ----------
export type PickGroup = { id: number | string; name: string; subtitle?: string; amount?: number | string };

export function GroupPickerSheet({
  visible, title, groups, onPick, onClose
}: { visible: boolean; title: string; groups: PickGroup[]; onPick: (g: PickGroup) => void; onClose: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>{title}</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                {groups.map((g) => (
                  <TouchableOpacity
                    key={String(g.id)}
                    onPress={() => onPick(g)}
                    activeOpacity={0.7}
                    style={[styles.pickRow, { borderColor: colors.border }]}
                  >
                    <View style={[styles.pickAvatar, { backgroundColor: colors.primary + '26' }]}>
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>{initials(g.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                        {g.name}
                      </Text>
                      {!!g.subtitle && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{g.subtitle}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  hero: { borderRadius: 22, padding: 20, marginBottom: 16, overflow: 'hidden' },
  blob: { position: 'absolute' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  heroPillText: { fontSize: 12, fontWeight: '600' },
  actionsPanel: { flexDirection: 'row', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 8, marginBottom: 22 },
  actionItem: { flex: 1, alignItems: 'center', gap: 8 },
  actionCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  groupCard: { width: 230, borderRadius: 18, borderWidth: 1, padding: 14, marginRight: 12, overflow: 'hidden' },
  groupStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  groupAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  groupName: { flex: 1, fontSize: 14, fontWeight: '700' },
  groupAmount: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  meetingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderLeftWidth: 4, padding: 14, marginBottom: 22 },
  meetingIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  whenChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  pickAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }
});
