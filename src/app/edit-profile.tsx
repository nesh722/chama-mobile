import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
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
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholderTextColor={colors.placeholder}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={colors.placeholder}
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>{loading ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});