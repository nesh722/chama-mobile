import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyGroups } from '../../../services/groupService';
import { useAppTheme } from '../../../context/ThemeContext';

export default function GroupsScreen() {
  const { colors } = useAppTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.text }]}>My Groups</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/create-group')}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>+ Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButtonSecondary, { borderColor: colors.primary }]}
            onPress={() => router.push('/join-group')}
          >
            <Text style={[styles.actionTextSecondary, { color: colors.primary }]}>Join Group</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={groups}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadGroups} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                No groups yet — create or join one above.
              </Text>
            ) : null
          }
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface }]}
              onPress={() => router.push(`/group/${item.id}`)}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                KES {item.contribution_amount} · {item.contribution_frequency} · {item.role}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonSecondary: { flex: 1, borderWidth: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { fontWeight: '600' },
  actionTextSecondary: { fontWeight: '600' },
  card: { padding: 16, borderRadius: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40 }
});