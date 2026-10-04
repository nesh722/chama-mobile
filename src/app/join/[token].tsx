import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { previewGroupByToken, joinByToken } from '../../../services/groupService';
import { getUser } from '../../../services/tokenService';
import { showAlert } from '../../../services/alertService';
import { useAppTheme } from '../../../context/ThemeContext';

export default function JoinByTokenScreen() {
  const { colors } = useAppTheme();
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([previewGroupByToken(token as string), getUser()])
      .then(([previewData, user]) => {
        setGroup(previewData.group);
        setLoggedIn(!!user);
      })
      .catch((err) => setError(err.response?.data?.message || 'Invalid or expired invite link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinByToken(token as string);
      showAlert('Success', `You've joined ${group.name}`);
      router.replace('/(tabs)/groups');
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>{error || 'Invite not found'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
      <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
      {group.description && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{group.description}</Text>
      )}
      <Text style={[styles.detail, { color: colors.text }]}>
        KES {group.contribution_amount} · {group.contribution_frequency}
      </Text>

      {loggedIn ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleJoin}
          disabled={joining}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {joining ? 'Joining...' : 'Join this group'}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={[styles.subtitle, { color: colors.textSecondary, marginBottom: 20 }]}>
            Log in or create an account first, then open this invite link again to join.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, marginBottom: 12 }]}
            onPress={() => router.push('/login')}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }]}
            onPress={() => router.push('/register')}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>Create Account</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  detail: { fontSize: 14, marginBottom: 24 },
  button: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10 },
  buttonText: { fontWeight: '600', fontSize: 16 }
});
