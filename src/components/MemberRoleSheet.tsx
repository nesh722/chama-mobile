import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export type RoleKey = 'chair' | 'treasurer' | 'secretary' | 'member';

const ROLE_INFO: Record<RoleKey, { label: string; description: string; icon: string }> = {
  chair: { label: 'Chair', description: 'Leads the group and approves loans and payouts', icon: 'ribbon-outline' },
  treasurer: { label: 'Treasurer', description: 'Handles money and approves loans and payouts', icon: 'cash-outline' },
  secretary: { label: 'Secretary', description: 'Meetings, minutes and notices. No money powers', icon: 'document-text-outline' },
  member: { label: 'Member', description: 'Saves, borrows and takes part in meetings', icon: 'person-outline' }
};
const ORDER: RoleKey[] = ['chair', 'treasurer', 'secretary', 'member'];

function useRoleColor() {
  const { colors } = useAppTheme();
  return (role: string) =>
    role === 'chair' ? colors.primary : role === 'treasurer' ? colors.success : role === 'secretary' ? '#8b5cf6' : colors.textMuted;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export function RoleBadge({ role }: { role: string }) {
  const color = useRoleColor()(role);
  const label = ROLE_INFO[role as RoleKey]?.label || role;
  return (
    <View style={[styles.badge, { backgroundColor: color + '24' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

type MemberItem = { id: number; full_name: string; role: string };
type ListProps = {
  members: MemberItem[];
  myUserId: number | null;
  canEdit: boolean; // chair / treasurer can change roles
  onPressMember: (m: MemberItem) => void;
};

// One rounded panel, hairline dividers between members
export function MemberList({ members, myUserId, canEdit, onPressMember }: ListProps) {
  const { colors } = useAppTheme();
  const roleColor = useRoleColor();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {members.map((m, i) => {
        const isMe = m.id === myUserId;
        const editable = canEdit && !isMe;
        const color = roleColor(m.role);
        const leader = m.role !== 'member';
        return (
          <TouchableOpacity
            key={m.id}
            activeOpacity={editable ? 0.6 : 1}
            onPress={editable ? () => onPressMember(m) : undefined}
            style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
          >
            <View style={[styles.smallAvatar, { backgroundColor: color + '24' }]}>
              <Text style={[styles.smallAvatarText, { color }]}>{initials(m.full_name)}</Text>
            </View>
            <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
              {m.full_name}
              {isMe ? <Text style={{ color: colors.textMuted, fontWeight: '400' }}>  (You)</Text> : null}
            </Text>
            <Text style={[styles.listRole, { color: leader ? color : colors.textMuted }]}>
              {(ROLE_INFO[m.role as RoleKey]?.label || m.role).toUpperCase()}
            </Text>
            {editable ? <Ionicons name="chevron-forward" size={15} color={colors.textMuted} /> : <View style={{ width: 15 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type SheetProps = {
  member: { id: number; name: string; currentRole: string } | null;
  onSelectRole: (role: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

export default function MemberRoleSheet({ member, onSelectRole, onRemove, onClose }: SheetProps) {
  const { colors } = useAppTheme();
  const roleColor = useRoleColor();

  return (
    <Modal visible={member !== null} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.header}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '24', width: 46, height: 46, borderRadius: 23 }]}>
                  <Text style={[styles.avatarText, { color: colors.primary, fontSize: 16 }]}>{initials(member?.name || '')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                    {member?.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>Choose a role</Text>
                </View>
              </View>

              {ORDER.map((r) => {
                const info = ROLE_INFO[r];
                const current = member?.currentRole === r;
                const color = roleColor(r);
                return (
                  <TouchableOpacity
                    key={r}
                    disabled={current}
                    onPress={() => onSelectRole(r)}
                    activeOpacity={0.7}
                    style={[
                      styles.option,
                      { borderColor: current ? color : colors.border, backgroundColor: current ? color + '14' : 'transparent' }
                    ]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: color + '24' }]}>
                      <Ionicons name={info.icon as any} size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>{info.label}</Text>
                      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{info.description}</Text>
                    </View>
                    {current && <Ionicons name="checkmark-circle" size={22} color={color} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity onPress={onRemove} style={[styles.remove, { backgroundColor: colors.danger + '1a' }]}>
                <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove from group</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.cancel}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  smallAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  smallAvatarText: { fontSize: 12, fontWeight: '700' },
  listName: { flex: 1, fontSize: 15, fontWeight: '500' },
  listRole: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 13, marginTop: 8 },
  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 2 }
});
