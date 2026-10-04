import { Ionicons } from '@expo/vector-icons';
import { TabList, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../context/ThemeContext';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
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
          <TabTrigger name="notifications" href="/notifications" asChild>
            <TabButton icon="notifications" label="Alerts" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: string; label: string }) {
  const { colors } = useAppTheme();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          { backgroundColor: isFocused ? colors.primary : 'transparent' }
        ]}
      >
        <Ionicons
          name={(isFocused ? icon : `${icon}-outline`) as any}
          size={16}
          color={isFocused ? colors.primaryText : colors.textMuted}
          style={{ marginRight: 4 }}
        />
        <Text style={{ fontSize: 13, color: isFocused ? colors.primaryText : colors.textSecondary }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: any) {
  const { colors } = useAppTheme();

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.brandText, { color: colors.text }]}>Chama App</Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth
  },
  brandText: { marginRight: 'auto', fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center'
  }
});
