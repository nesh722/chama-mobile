import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
<>
    <Stack.Screen
      options={{
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 17, marginLeft: 2 }}>Back</Text>
          </TouchableOpacity>
        )
      }}
    />

    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Create a group</Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>Set up contribution rules for your chama</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="people-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Group Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="cash-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Contribution Amount (KES)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Contribution frequency</Text>
          <View style={[styles.freqRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {['weekly', 'monthly'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.freqButton,
                  frequency === f && { backgroundColor: colors.primary }
                ]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[
                  styles.freqText,
                  { color: frequency === f ? colors.primaryText : colors.textSecondary }
                ]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  headerBlock: { marginBottom: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  subtext: { fontSize: 13, textAlign: 'center' },
  card: { borderRadius: 16, padding: 20 },
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
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  freqRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20
  },
  freqButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  freqText: { fontWeight: '600', fontSize: 14 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 }
});
