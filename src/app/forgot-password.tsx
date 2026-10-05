import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../services/alertService';
import { requestPasswordReset } from '../../services/authService';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequest = async () => {
    if (!email) {
      showAlert('Missing Info', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      showAlert('Check Your Email', 'If that email exists, a reset code has been sent to it.');
      router.push('/reset-password');
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
            <Ionicons name="key-outline" size={32} color={colors.primaryText} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Enter your email and we'll send you a reset code
          </Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleRequest} disabled={loading}>
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>{loading ? 'Sending...' : 'Send Reset Code'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backLink}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Back to Login</Text>
        </TouchableOpacity>
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
  buttonText: { fontWeight: '600', fontSize: 16 },
  backLink: { marginTop: 24, alignItems: 'center' }
});
