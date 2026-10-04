import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showAlert } from '../../services/alertService';
import { joinByToken } from '../../services/groupService';
import { useAppTheme } from '../../context/ThemeContext';

// Accepts either a raw token, or a full link like "mobile://join/<token>"
// or "exp://host:port/--/join/<token>" -- just grabs the last path segment.
function extractToken(input: string) {
  const trimmed = input.trim();
  const parts = trimmed.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export default function JoinGroupScreen() {
  const { colors } = useAppTheme();
  const [inviteInput, setInviteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (!inviteInput) {
      showAlert('Missing Info', 'Paste an invite link or code to join');
      return;
    }
    setLoading(true);
    try {
      const token = extractToken(inviteInput);
      await joinByToken(token);
      showAlert('Success', 'Joined group successfully');
      router.replace('/(tabs)/groups');
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Invalid or expired invite link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>Join Group</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Paste the invite link or code someone shared with you
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Invite link or code"
            value={inviteInput}
            onChangeText={setInviteInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleJoin}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {loading ? 'Joining...' : 'Join Group'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  hint: { textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});