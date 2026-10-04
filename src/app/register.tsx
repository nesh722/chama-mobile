import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../services/alertService';
import { register } from '../../services/authService';
import { useAppTheme } from '../../context/ThemeContext';
import Logo from '../components/logo';

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      showAlert('Missing Info', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      showAlert('Invalid Phone', 'Phone number must be exactly 10 digits');
      return;
    }

    if (password.length < 8) {
      showAlert('Weak Password', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await register(fullName, email.trim(), phone, password);
      showAlert('Success', 'Account created! Please log in.');
      router.replace('/login');
    } catch (err: any) {
      showAlert('Registration Failed', err.response?.data?.message || err.message);
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
        <View style={styles.topBlock}>
          <Logo size={88} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.welcome, { color: colors.text }]}>Create account</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>Join or start your chama</Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={colors.placeholder}
            />
          </View>

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

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.placeholder}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>Minimum 8 characters</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {loading ? 'Creating...' : 'Register'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginLink}>
          <Text style={{ color: colors.textMuted }}>
            Already have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  topBlock: { alignItems: 'center', marginBottom: 8 },
  card: { borderRadius: 16, padding: 20, marginTop: 8 },
  welcome: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtext: { fontSize: 13, marginBottom: 20 },
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
  buttonText: { fontWeight: '600', fontSize: 16 },
  loginLink: { marginTop: 24, alignItems: 'center' }
});