import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
      <Text style={[styles.hint,  { color: colors.textSecondary }]}>Enter your email to reset your password</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={colors.placeholder}
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleRequest} disabled={loading}>
        <Text style={[styles.buttonText, { color: colors.primaryText }]}>{loading ? 'Sending...' : 'Send Reset Code'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/login')}>
        <Text style={[styles.link, { color: colors.primary }]}>Back to Login</Text>
      </TouchableOpacity>
    </View>
     </ScrollView>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  hint: { textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 },
  link: { marginTop: 20, textAlign: 'center', }
});