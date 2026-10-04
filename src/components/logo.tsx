import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../../context/ThemeContext';

export default function Logo({ size = 72 }: { size?: number }) {
  const { colors } = useAppTheme();
  const radius = size * 0.32;
  const ringRadius = size * 0.12;
  const strokeWidth = size * 0.025;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r={radius * (100 / size)} fill={colors.primary} />
        <Circle cx={50 - 9} cy={50 - 5} r={ringRadius * (100 / size)} fill="none" stroke={colors.background} strokeWidth={strokeWidth * (100 / size)} />
        <Circle cx={50 + 9} cy={50 - 5} r={ringRadius * (100 / size)} fill="none" stroke={colors.background} strokeWidth={strokeWidth * (100 / size)} />
        <Circle cx="50" cy={50 + 10} r={ringRadius * (100 / size)} fill="none" stroke={colors.background} strokeWidth={strokeWidth * (100 / size)} />
      </Svg>
      <Text style={[styles.wordmark, { color: colors.text }]}>Chama App</Text>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>Save together, grow together</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 24 },
  wordmark: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  tagline: { fontSize: 12, marginTop: 2 }
});