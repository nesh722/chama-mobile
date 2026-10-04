import { Ionicons } from '@expo/vector-icons';
import { TabList, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../context/ThemeContext';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={[
          styles.tabList,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            backgroundColor: colors.background,
            borderTopColor: colors.border
          }
        ]}
      >
        <TabTrigger name="home" href="/" asChild>
          <TabButton icon="home" label="Home" />
        </TabTrigger>
        <TabTrigger name="groups" href="/groups" asChild>
          <TabButton icon="people" label="Groups" />
        </TabTrigger>
        <TabTrigger name="activity" href="/activity" asChild>
          <TabButton icon="time" label="Activity" />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton icon="person" label="Profile" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: string; label: string }) {
  const { colors } = useAppTheme();
  const activeColor = colors.primary;
  const inactiveColor = colors.textMuted;

  return (
    <Pressable {...props} style={styles.tabButton}>
      <View style={[styles.pill, isFocused && { backgroundColor: activeColor }]}>
        <Ionicons
          name={(isFocused ? icon : `${icon}-outline`) as any}
          size={20}
          color={isFocused ? colors.primaryText : inactiveColor}
        />
      </View>
      <Text style={[styles.label, { color: isFocused ? activeColor : inactiveColor }, isFocused && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabList: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pill: { width: 44, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11 },
  labelActive: { fontWeight: '600' }
});
