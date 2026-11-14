import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SERVER_BASE_URL } from '../../../config/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../services/alertService';
import { deleteAccount, getProfile, uploadAvatar } from '../../../services/authService';
import { clearAuth } from '../../../services/tokenService';
import { unregisterPushToken } from '../../../services/pushService';

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { mode, setMode, colors } = useAppTheme();

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setUser(data.user);
    } catch (err: any) {
      console.log('Error loading profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission Needed', 'Please allow photo library access to set a profile picture');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      await uploadAvatar(result.assets[0].uri);
      showAlert('Success', 'Profile picture updated');
      loadProfile();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    showConfirm('Log Out', 'Are you sure you want to log out?', async () => {
      await unregisterPushToken(); // must run before clearAuth, which deletes the login token
      await clearAuth();
      router.replace('/login');
    });
  };

  const handleDeleteAccount = () => {
    showConfirm(
      'Delete Account',
      'This will permanently delete your account. This cannot be undone. Are you sure?',
      async () => {
        try {
          await deleteAccount();
          await clearAuth();
          showAlert('Account Deleted', 'Your account has been deleted');
          router.replace('/login');
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const accountRows = [
    { icon: 'person-outline', label: 'Edit Profile', color: colors.primary, route: '/edit-profile' },
    { icon: 'mail-outline', label: 'Change Email', color: colors.success, route: '/change-email' },
    { icon: 'lock-closed-outline', label: 'Change Password', color: '#8b5cf6', route: '/change-password' }
  ];

  const themes = [
    { key: 'light', label: 'Light', icon: 'sunny-outline' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline' },
    { key: 'system', label: 'System', icon: 'phone-portrait-outline' }
  ] as const;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: colors.text }]}>Profile</Text>

        {/* Hero: photo, name, contact details */}
        <View style={[styles.hero, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading} activeOpacity={0.85}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '66' }]}>
              {user?.avatar_url ? (
                <Image
                  source={{ uri: `${SERVER_BASE_URL}${user.avatar_url}` }}
                  style={[styles.avatarImage, { backgroundColor: colors.background }]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitials}>{getInitials(user?.full_name)}</Text>
                </View>
              )}
            </View>
            <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          <Text style={[styles.name, { color: colors.text }]}>{user?.full_name}</Text>
          {!!memberSince && <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>Member since {memberSince}</Text>}

          {user && (
            <View style={[styles.contact, { borderTopColor: colors.border }]}>
              <View style={styles.infoRow}>
                <View style={[styles.smallIcon, { backgroundColor: colors.primary + '1f' }]}>
                  <Ionicons name="mail-outline" size={15} color={colors.primary} />
                </View>
                <Text style={[styles.detail, { color: colors.text }]} numberOfLines={1}>{user.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={[styles.smallIcon, { backgroundColor: colors.success + '1f' }]}>
                  <Ionicons name="call-outline" size={15} color={colors.success} />
                </View>
                <Text style={[styles.detail, { color: colors.text }]}>{user.phone}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Account settings, one grouped list */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          {accountRows.map((r, i) => (
            <TouchableOpacity
              key={r.label}
              style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              onPress={() => router.push(r.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.rowIcon, { backgroundColor: r.color + '24' }]}>
                <Ionicons name={r.icon as any} size={18} color={r.color} />
              </View>
              <Text style={[styles.settingsButtonText, { color: colors.text }]}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.segment, { backgroundColor: colors.surface }]}>
          {themes.map((t) => {
            const active = mode === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.segmentItem, active && { backgroundColor: colors.primary }]}
                onPress={() => setMode(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={16} color={active ? colors.primaryText : colors.textSecondary} />
                <Text style={[styles.themeOptionText, { color: active ? colors.primaryText : colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger + '1a', borderColor: colors.danger + '66' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Text style={[styles.deleteAccountText, { color: colors.textMuted }]}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 16 },
  hero: { borderRadius: 22, padding: 20, alignItems: 'center', marginBottom: 8 },
  avatarRing: { width: 108, height: 108, borderRadius: 54, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  editBadge: { position: 'absolute', bottom: 2, right: 2, borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  name: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  contact: { alignSelf: 'stretch', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  smallIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detail: { fontSize: 14, flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  list: { borderRadius: 16, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingsButtonText: { fontSize: 15, fontWeight: '600', flex: 1 },
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  themeOptionText: { fontWeight: '600', fontSize: 13 },
  logoutButton: { padding: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, marginTop: 26 },
  logoutText: { fontWeight: '700', fontSize: 16 },
  deleteAccountButton: { padding: 14, alignItems: 'center', marginTop: 6 },
  deleteAccountText: { fontSize: 13, fontWeight: '500' }
});
