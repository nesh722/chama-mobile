import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const initials = (name: string) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const money = (n: any) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Same palette and rule as the Groups list, so a group keeps its colour everywhere
export function useGroupAccent(id: number | string) {
  const { colors } = useAppTheme();
  const accents = [colors.primary, colors.success, '#8b5cf6', colors.warning, '#ec4899', '#06b6d4'];
  return accents[Math.abs(Number(id) || 0) % accents.length];
}

type HeaderProps = {
  groupId: number | string;
  name: string;
  description?: string | null;
  amount: number | string;
  frequency: string;
  role: string | null;
  memberCount: number;
  canEdit: boolean;
  onEdit: () => void;
};

export function GroupHeader({ groupId, name, description, amount, frequency, memberCount, canEdit, onEdit }: HeaderProps) {
  const { colors } = useAppTheme();
  const accent = useGroupAccent(groupId);

  return (
    <View style={styles.simple}>
      <View style={[styles.simpleAvatar, { backgroundColor: accent + '26' }]}>
        <Text style={{ color: accent, fontWeight: '800', fontSize: 15 }}>{initials(name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text, fontSize: 19 }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
          KES {money(amount)} · {cap(frequency)} · {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>
      {canEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------- Scrolling pill tabs ----------
type Tab = { key: string; label: string };

export function TabPills({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: any) => void }) {
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});

  // Keep the active pill in view (also when the screen opens straight onto a later tab)
  useEffect(() => {
    const x = positions.current[active];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(x - 24, 0), animated: true });
  }, [active]);

  return (
       <View style={{ height: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: 12 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' }}
      >
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <TouchableOpacity
              key={t.key}
              onLayout={(e) => {
                positions.current[t.key] = e.nativeEvent.layout.x;
                if (isActive) scrollRef.current?.scrollTo({ x: Math.max(e.nativeEvent.layout.x - 24, 0), animated: false });
              }}
              onPress={() => onChange(t.key)}
              activeOpacity={0.8}
              style={[styles.pill, { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: isActive ? colors.primary : colors.border }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? colors.primaryText : colors.textSecondary }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 4, marginBottom: 12, borderRadius: 20, borderWidth: 1, padding: 16, overflow: 'hidden' },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, height: 36, alignItems: 'center', justifyContent: 'center' },
  simple: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  simpleAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
