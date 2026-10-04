import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showAlert } from '../../services/alertService';
import { resetPassword } from '../../services/authService';
import { useAppTheme } from '../../context/ThemeContext';

export default function ResetPasswordScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!token || !newPassword) {
      showAlert('Missing Info', 'Please enter the reset token and a new password');
      return;
    }
    if (newPassword.length < 8) {
      showAlert('Weak Password', 'Password must be at least 8 characters long');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      showAlert('Success', 'Password reset successfully. Please log in.');
      router.replace('/login');
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
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
          <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Reset Token"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Minimum 8 characters</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  hint: { fontSize: 12, marginBottom: 16 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});