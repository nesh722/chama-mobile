import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Logo({ size = 72 }: { size?: number }) {
  return (
    <View style={styles.container}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name="wallet" size={size * 0.5} color="#fff" />
      </View>
      <Text style={styles.wordmark}>Chama App</Text>
      <Text style={styles.tagline}>Save together, grow together</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 24 },
  circle: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  wordmark: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  tagline: { fontSize: 12, color: '#888', marginTop: 2 }
});