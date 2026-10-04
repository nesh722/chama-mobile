import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showAlert } from '../../services/alertService';
import { createGroup } from '../../services/groupService';
import { useAppTheme } from '../../context/ThemeContext';

export default function CreateGroupScreen() {
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name || !amount) {
      showAlert('Missing info', 'Group name and contribution amount are required');
      return;
    }
    setLoading(true);
    try {
      await createGroup(name, description, parseFloat(amount), frequency);
      showAlert('Success', 'Group created successfully');
      router.replace('/(tabs)/groups');
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
          <Text style={[styles.title, { color: colors.text }]}>Create Group</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Group Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Contribution Amount (KES)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor={colors.placeholder}
          />

          <View style={styles.freqRow}>
            {['weekly', 'monthly'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.freqButton,
                  { borderColor: colors.border },
                  frequency === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setFrequency(f)}
              >
                <Text style={frequency === f ? [styles.freqTextActive, { color: colors.primaryText }] : { color: colors.text }}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {loading ? 'Creating...' : 'Create Group'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  freqRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  freqButton: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  freqTextActive: { fontWeight: '600' },
  button: { padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});