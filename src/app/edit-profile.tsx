import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProfile, updateProfile } from '../../services/authService';
import { showAlert } from '../../services/alertService';
import { useAppTheme } from '../../context/ThemeContext';

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getProfile().then((data) => {
      setFullName(data.user.full_name);
      setPhone(data.user.phone);
    });
  }, []);

  const handleSave = async () => {
    if (!fullName || !phone) {
      showAlert('Missing Info', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await updateProfile(fullName, phone);
      showAlert('Success', 'Profile updated successfully');
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
            <Ionicons name="person-outline" size={32} color={colors.primaryText} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Edit profile</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            Update your name and phone number
          </Text>

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

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>{loading ? 'Saving...' : 'Save Changes'}</Text>
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
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  buttonText: { fontWeight: '600', fontSize: 16 }
});
