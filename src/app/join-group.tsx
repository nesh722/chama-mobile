import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.iconBlock}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="qr-code-outline" size={32} color={colors.primaryText} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Join a group</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Paste the invite link or code someone shared with you
          </Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="link-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Invite link or code"
              value={inviteInput}
              onChangeText={setInviteInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.placeholder}
            />
          </View>

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
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  iconBlock: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  subtext: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});
