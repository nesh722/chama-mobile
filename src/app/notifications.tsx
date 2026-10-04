import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyNotifications, markAsRead, clearAllNotifications } from '../../services/notificationService';
import { useAppTheme } from '../../context/ThemeContext';

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data.notifications);
    } catch (err: any) {
      console.log('Error loading notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handlePress = async (item: any) => {
    if (item.is_read) return;
    try {
      await markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n))
      );
    } catch (err: any) {
      console.log('Error marking as read:', err.message);
    }
  };

     const handleClearAll = () => {
    Alert.alert(
      'Clear all notifications?',
      'This will permanently delete all your notifications. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllNotifications();
              setNotifications([]);
            } catch (err: any) {
              console.log('Error clearing notifications:', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.text }]}>Notifications</Text>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadNotifications} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>No notifications yet.</Text> : null
          }
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: colors.surfaceAlt },
                !item.is_read && { backgroundColor: colors.primary + '1a', borderWidth: 1, borderColor: colors.primary + '55' }
              ]}
              onPress={() => handlePress(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                {!item.is_read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.cardMessage, { color: colors.textSecondary }]}>{item.message}</Text>
              <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                {new Date(item.created_at).toLocaleString()}
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
  header: { fontSize: 24, fontWeight: 'bold', },
  card: { padding: 14, borderRadius: 10, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardMessage: { fontSize: 14, marginTop: 4 },
  cardDate: { fontSize: 12, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  clearText: { fontSize: 14, fontWeight: '600' }
});