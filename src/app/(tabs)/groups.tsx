import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyGroups } from '../../../services/groupService';
import { useAppTheme } from '../../../context/ThemeContext';

const initials = (name: string) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const money = (n: any) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export default function GroupsScreen() {
  const { colors } = useAppTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const accents = [colors.primary, colors.success, '#8b5cf6', colors.warning, '#ec4899', '#06b6d4'];
  // Same group, same colour every time (based on its id, not its position in the list)
  const accentFor = (id: number | string) => accents[Math.abs(Number(id) || 0) % accents.length];

  const roleColor = (role: string) =>
    role === 'chair' ? colors.primary : role === 'treasurer' ? colors.success : role === 'secretary' ? '#8b5cf6' : colors.textMuted;

  const loadGroups = async () => {
    try {
      const data = await getMyGroups();
      setGroups(data.groups);
    } catch (err: any) {
      console.log('Error loading groups:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const shown = groups.filter((g: any) => g.name.toLowerCase().includes(search.trim().toLowerCase()));

  const renderGroup = ({ item }: any) => {
    const accent = accentFor(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: accent }]}
        onPress={() => router.push(`/group/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: accent + '26' }]}>
          <Text style={{ color: accent, fontWeight: '800', fontSize: 15 }}>{initials(item.name)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            KES {money(item.contribution_amount)} · {cap(item.contribution_frequency)}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text style={[styles.role, { color: roleColor(item.role) }]}>{String(item.role).toUpperCase()}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.header, { color: colors.text }]}>My Groups</Text>
          {groups.length > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </Text>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary + '1a', borderColor: colors.primary + '55' }]}
            onPress={() => router.push('/create-group')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success + '1a', borderColor: colors.success + '55' }]}
            onPress={() => router.push('/join-group')}
            activeOpacity={0.8}
          >
            <Ionicons name="enter-outline" size={20} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.text }]}>Join Group</Text>
          </TouchableOpacity>
        </View>

        {groups.length > 3 && (
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search your groups"
              placeholderTextColor={colors.placeholder}
              style={{ flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14 }}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          data={shown}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadGroups} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '1a' }]}>
                  <Ionicons name={groups.length === 0 ? 'people-outline' : 'search-outline'} size={34} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {groups.length === 0 ? 'No groups yet' : 'No matching groups'}
                </Text>
                <Text style={[styles.empty, { color: colors.textMuted }]}>
                  {groups.length === 0
                    ? 'Create your own chama or join one with an invite link.'
                    : `Nothing matches "${search.trim()}".`}
                </Text>
              </View>
            ) : null
          }
          renderItem={renderGroup}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  header: { fontSize: 26, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 13, borderRadius: 14 },
  actionText: { fontWeight: '600', fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, marginBottom: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderLeftWidth: 4, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  role: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  emptyBox: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  empty: { textAlign: 'center', lineHeight: 20 }
});
