import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyActivity } from '../../../services/activityService';
import { useAppTheme } from '../../../context/ThemeContext';
import { ACTIVITY_ICONS } from '../../../utils/activityIcons';

type Category = 'money' | 'loans' | 'meetings' | 'groups';
type Filter = 'all' | Category;

// Works out a category from the action_type name, so new action types still land somewhere sensible
const categoryOf = (type: string): Category => {
  const t = String(type || '').toLowerCase();
  if (t.includes('loan')) return 'loans';
  if (t.includes('meeting') || t.includes('minutes') || t.includes('announcement')) return 'meetings';
  if (t.includes('contribution') || t.includes('payout') || t.includes('saving') || t.includes('payment') || t.includes('cash') || t.includes('mpesa'))
    return 'money';
  return 'groups';
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dayLabel = (iso: string) => {
  const diff = Math.round((dayStart(new Date()) - dayStart(new Date(iso))) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: diff > 300 ? 'numeric' : undefined });
};

export default function ActivityScreen() {
  const { colors } = useAppTheme();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const catColor: Record<Category, string> = {
    money: colors.success,
    loans: colors.warning,
    meetings: '#8b5cf6',
    groups: colors.primary
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'money', label: 'Money' },
    { key: 'loans', label: 'Loans' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'groups', label: 'Groups' }
  ];

  const loadActivity = async () => {
    try {
      const data = await getMyActivity();
      setEntries(data.activity);
    } catch (err: any) {
      console.log('Error loading activity:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [])
  );

  // Flat list with a header row whenever the day changes
  const rows = useMemo(() => {
    const out: any[] = [];
    let lastDay = '';
    entries
      .filter((e) => filter === 'all' || categoryOf(e.action_type) === filter)
      .forEach((e) => {
        const label = dayLabel(e.created_at);
        if (label !== lastDay) {
          out.push({ kind: 'header', key: `h-${label}-${e.id}`, label });
          lastDay = label;
        }
        out.push({ kind: 'entry', key: `e-${e.id}`, item: e });
      });
    return out;
  }, [entries, filter]);

  const renderRow = ({ item: row }: any) => {
    if (row.kind === 'header') {
      return <Text style={[styles.dayHeader, { color: colors.textMuted }]}>{row.label.toUpperCase()}</Text>;
    }
    const e = row.item;
    const color = catColor[categoryOf(e.action_type)];
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color }]}>
        <View style={[styles.iconWrap, { backgroundColor: color + '24' }]}>
          <Ionicons name={(ACTIVITY_ICONS[e.action_type] || 'ellipse') as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.description, { color: colors.text }]}>{e.description}</Text>
          <View style={styles.metaRow}>
            {!!e.group_name && <Text style={[styles.groupTag, { color }]} numberOfLines={1}>{e.group_name}</Text>}
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.text }]}>Activity</Text>

        <View style={{ height: 40, marginBottom: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {filters.map((f) => {
              const active = filter === f.key;
              const color = f.key === 'all' ? colors.primary : catColor[f.key as Category];
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.8}
                  style={[styles.chip, { borderColor: active ? color : colors.border, backgroundColor: active ? color : 'transparent' }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? colors.primaryText : colors.textSecondary }}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(row: any) => row.key}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadActivity} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="time-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.empty, { color: colors.textMuted }]}>
                  {filter === 'all' ? 'No activity yet.' : 'Nothing here yet for this filter.'}
                </Text>
              </View>
            ) : null
          }
          renderItem={renderRow}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, justifyContent: 'center', height: 34 },
  dayHeader: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, borderLeftWidth: 4, marginBottom: 8, alignItems: 'flex-start' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  description: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  groupTag: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 12 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 10 },
  empty: { textAlign: 'center' }
});
