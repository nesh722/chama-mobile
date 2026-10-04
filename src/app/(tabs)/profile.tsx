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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: colors.text }]}>Profile</Text>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: `${SERVER_BASE_URL}${user.avatar_url}` }}
                style={[styles.avatarImage, { backgroundColor: colors.surface }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitials}>{getInitials(user?.full_name)}</Text>
              </View>
            )}
            <View style={[styles.editBadge, { borderColor: colors.background }]}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.text }]}>{user?.full_name}</Text>
        </View>

        {user && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.icon} />
              <Text style={[styles.detail, { color: colors.text }]}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.icon} />
              <Text style={[styles.detail, { color: colors.text }]}>{user.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={styles.icon} />
              <Text style={[styles.detail, { color: colors.text }]}>
                Member since {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/edit-profile')}
        >
          <Ionicons name="person-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.settingsButtonText, { color: colors.text }]}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/change-email')}
        >
          <Ionicons name="mail-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.settingsButtonText, { color: colors.text }]}>Change Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/change-password')}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={[styles.settingsButtonText, { color: colors.text }]}>Change Password</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Appearance</Text>
        <View style={styles.themeRow}>
          {(['light', 'dark', 'system'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.themeOption,
                { backgroundColor: mode === m ? colors.primary : colors.surface }
              ]}
              onPress={() => setMode(m)}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  { color: mode === m ? colors.primaryText : colors.text }
                ]}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Text style={[styles.deleteAccountText, { color: colors.danger }]}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitials: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#111',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2
  },
  name: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  card: { padding: 20, borderRadius: 10, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { marginRight: 10 },
  detail: { fontSize: 14 },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10
  },
  settingsButtonText: { fontSize: 15, fontWeight: '500' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  themeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  themeOption: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  themeOptionText: { fontWeight: '600', fontSize: 13 },
  logoutButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  deleteAccountButton: { padding: 14, alignItems: 'center', marginTop: 10 },
  deleteAccountText: { fontSize: 14, fontWeight: '500' }
});