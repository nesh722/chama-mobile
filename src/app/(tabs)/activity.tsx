// app/(tabs)/activity.tsx
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyActivity } from '../../../services/activityService';
import { useAppTheme } from '../../../context/ThemeContext';

const ICONS: Record<string, string> = {
  joined_group: 'people',
  created_group: 'add-circle',
  deleted_group: 'trash',
  left_group: 'exit',
  removed_from_group: 'remove-circle',
  role_changed: 'shield-checkmark',
  logged_contribution: 'wallet',
  requested_loan: 'cash',
  loan_approved: 'checkmark-circle',
  loan_rejected: 'close-circle',
  loan_repayment: 'card',
  rotation_setup: 'repeat',
  payout_received: 'gift',
  target_set: 'flag'
};

export default function ActivityScreen() {
  const { colors } = useAppTheme();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.text }]}>Activity</Text>

        <FlatList
          data={entries}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadActivity} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>No activity yet.</Text> : null
          }
          renderItem={({ item }: any) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name={(ICONS[item.action_type] || 'ellipse') as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.description, { color: colors.text }]}>{item.description}</Text>
                {item.group_name && (
                  <Text style={[styles.groupTag, { color: colors.primary }]}>{item.group_name}</Text>
                )}
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
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
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'flex-start' },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  description: { fontSize: 14, fontWeight: '500' },
  groupTag: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  date: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40 }
});
