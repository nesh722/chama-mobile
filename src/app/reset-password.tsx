import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../services/alertService';
import { resetPassword } from '../../services/authService';
import { useAppTheme } from '../../context/ThemeContext';

export default function ResetPasswordScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <View style={styles.iconBlock}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark-outline" size={32} color={colors.primaryText} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Enter the code we sent you and choose a new password
          </Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="keypad-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Reset Token"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholderTextColor={colors.placeholder}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
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
    marginBottom: 14
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },
  hint: { fontSize: 12, marginTop: -8, marginBottom: 16 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});
