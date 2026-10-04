import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '../../services/authService';
import { showAlert } from '../../services/alertService';
import { useAppTheme } from '../../context/ThemeContext';

export default function ChangePasswordScreen() {
  const { colors } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!currentPassword || !newPassword) {
      showAlert('Missing Info', 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 8) {
      showAlert('Weak Password', 'New password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showAlert('Success', 'Password changed successfully');
      router.back();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.iconBlock}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="key-outline" size={32} color={colors.primaryText} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Change password</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Choose a new password for your account
          </Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              placeholderTextColor={colors.placeholder}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} hitSlop={8}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              placeholderTextColor={colors.placeholder}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={8}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>Minimum 8 characters</Text>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>{loading ? 'Saving...' : 'Change Password'}</Text>
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
