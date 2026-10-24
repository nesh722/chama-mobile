import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getProfile } from '../../../services/authService';
import { getMyContributions, getMyDueStatus } from '../../../services/contributionService';
import { getMyGroups, getMySavingsProgress } from '../../../services/groupService';
import { getMyLoans, getPendingApprovals } from '../../../services/loanService';
import { getMyActivity } from '../../../services/activityService';
import { getMyNotifications } from '../../../services/notificationService';
import { getMySavings } from '../../../services/savingsService';
import { useAppTheme } from '../../../context/ThemeContext';
import { formatCycleLabel } from '../../../utils/formatCycleLabel';
import { ACTIVITY_ICONS } from '../../../utils/activityIcons';
import { formatMoney } from '../../../utils/describeInterest';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function loanDueInfo(loan: any) {
  if (loan.status === 'requested') return { text: 'Awaiting approval', overdue: false };
  if (!loan.due_date) return { text: 'No due date', overdue: false };

  const due = new Date(loan.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - due.getTime()) / 86400000);

  if (diff > 0) return { text: `Overdue by ${diff} day${diff === 1 ? '' : 's'}`, overdue: true };
  if (diff === 0) return { text: 'Due today', overdue: false };
  return { text: `Due in ${-diff} day${diff === -1 ? '' : 's'} · ${due.toLocaleDateString()}`, overdue: false };
}

export default function HomeScreen() {
  const { colors, isDark, setMode } = useAppTheme();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [activeLoanCount, setActiveLoanCount] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [contributionsByGroup, setContributionsByGroup] = useState<
  { groupName: string; total: number; contributions: number; extra: number }[]>([]);
  const [extraSavingsByGroup, setExtraSavingsByGroup] = useState<{ groupName: string; total: number }[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [dueStatus, setDueStatus] = useState<any[]>([]);
  const [targetProgress, setTargetProgress] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openLoans, setOpenLoans] = useState<any[]>([]);

  const loadDashboard = async () => {
    try {
      const [
        profileData,
        groupsData,
        loansData,
        contribData,
        savingsData,
        pendingData,
        dueData,
        progressData,
        activityData,
        notificationsData
      ] = await Promise.all([
        getProfile(),
        getMyGroups(),
        getMyLoans(),
        getMyContributions(),
        getMySavings(),
        getPendingApprovals(),
        getMyDueStatus(),
        getMySavingsProgress(),
        getMyActivity(),
        getMyNotifications()
      ]);

      setUser(profileData.user);
      setGroupCount(groupsData.groups.length);
      setActiveLoanCount(
        loansData.loans.filter((l: any) => l.status === 'approved' || l.status === 'requested').length
      );
const open = loansData.loans.filter((l: any) => l.status === 'approved' || l.status === 'requested');
open.sort((a: any, b: any) => {
  // Approved loans first, then the soonest due date first, so overdue ones come at the top
  if (a.status !== b.status) return a.status === 'approved' ? -1 : 1;
  return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
});
setOpenLoans(open);
      // Paid and partial payments both count, since a partial payment is real money in the group
const counted = contribData.contributions.filter((c: any) => c.status === 'paid' || c.status === 'partial');
const contributionTotal = counted.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);
const extraTotal = savingsData.savings.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0);

// "Total Saved" is contributions plus extra savings
setTotalContributed(contributionTotal + extraTotal);

const grouped: Record<string, { contributions: number; extra: number }> = {};
counted.forEach((c: any) => {
  grouped[c.group_name] = grouped[c.group_name] || { contributions: 0, extra: 0 };
  grouped[c.group_name].contributions += parseFloat(c.amount);
});
savingsData.savings.forEach((s: any) => {
  grouped[s.group_name] = grouped[s.group_name] || { contributions: 0, extra: 0 };
  grouped[s.group_name].extra += parseFloat(s.amount);
});
setContributionsByGroup(
  Object.entries(grouped).map(([groupName, v]) => ({
    groupName,
    contributions: v.contributions,
    extra: v.extra,
    total: v.contributions + v.extra
  }))
);
const groupedSavings: Record<string, number> = {};
      savingsData.savings.forEach((s: any) => {
        groupedSavings[s.group_name] = (groupedSavings[s.group_name] || 0) + parseFloat(s.amount);
      });
      setExtraSavingsByGroup(Object.entries(groupedSavings).map(([groupName, total]) => ({ groupName, total })));

      setPendingApprovals(pendingData.pending);
      setDueStatus(dueData.due.filter((d: any) => !d.isPaid));
      setTargetProgress(progressData.progress);
      setRecentActivity(activityData.activity.slice(0, 2));
      setLatestNotification(notificationsData.notifications[0] || null);
      setUnreadCount(notificationsData.notifications.filter((n: any) => !n.is_read).length);
    } catch (err: any) {
      console.log('Error loading dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const toggleTheme = () => setMode(isDark ? 'light' : 'dark');

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalOwed = openLoans
  .filter((l: any) => l.status === 'approved')
  .reduce((sum: number, l: any) => sum + (Number(l.totalOutstanding) || 0), 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {user ? `${getGreeting()}, ${user.full_name.split(' ')[0]}` : getGreeting()} 👋
            </Text>
            <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
              Here's your savings overview
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{groupCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Groups</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{activeLoanCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Loans</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              KES {totalContributed.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Saved</Text>
          </View>
        </View>

        {openLoans.length > 0 && (
  <View style={styles.section}>
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 0 }]}>My Loans</Text>
      {totalOwed > 0 && (
        <Text style={[styles.seeAll, { color: colors.textSecondary }]}>{formatMoney(totalOwed)} owed</Text>
      )}
    </View>

    {openLoans.map((loan: any) => {
      const info = loanDueInfo(loan);
      const approved = loan.status === 'approved';
      const lateInterest = Number(loan.interestOutstanding) || 0;
      const accent = info.overdue ? colors.danger : colors.primary;

      return (
        <TouchableOpacity
          key={loan.id}
          style={[styles.rowCard, styles.loanRowCard, { backgroundColor: colors.surface }]}
          onPress={() =>
            router.push({ pathname: '/group/[id]', params: { id: String(loan.group_id), tab: 'loans' } })
          }
        >
          <View style={[styles.iconWrap, { backgroundColor: accent + '1a' }]}>
            <Ionicons
              name={info.overdue ? 'alert-circle' : approved ? 'cash-outline' : 'time-outline'}
              size={18}
              color={accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.rowCardTitle, { color: colors.text }]}>{loan.group_name}</Text>
            <Text
              style={[
                styles.rowCardSubtitle,
                { color: info.overdue ? colors.danger : colors.textSecondary, marginTop: 2 }
              ]}
            >
              {info.text}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.rowCardTitle, { color: colors.text }]}>
              {formatMoney(approved ? loan.totalOutstanding : loan.amount)}
            </Text>
            {approved && lateInterest > 0 && (
              <Text style={[styles.rowCardSubtitle, { color: colors.danger, marginTop: 2 }]}>
                incl. {formatMoney(lateInterest)} late interest
              </Text>
            )}
          </View>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      );
    })}
  </View>
)}

        {contributionsByGroup.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Savings by Group</Text>
           {contributionsByGroup.map((g) => (
  <View key={g.groupName} style={[styles.rowCard, { backgroundColor: colors.surface }]}>
    <View style={styles.progressHeaderRow}>
      <Text style={[styles.rowCardTitle, { color: colors.text }]}>{g.groupName}</Text>
      <Text style={[styles.rowCardTitle, { color: colors.primary }]}>
        KES {g.total.toLocaleString()}
      </Text>
    </View>
    {g.extra > 0 && (
      <Text style={[styles.rowCardSubtitle, { color: colors.textMuted, marginTop: 0 }]}>
        KES {g.contributions.toLocaleString()} contributions + KES {g.extra.toLocaleString()} extra
      </Text>
    )}
  </View>
))}
          </View>
        )}

        {pendingApprovals.length > 0 && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/group/[id]', params: { id: String(pendingApprovals[0].group_id), tab: 'loans' } })}
          >
            <Ionicons name="alert-circle" size={20} color={colors.primaryText} />
            <Text style={[styles.bannerText, { color: colors.primaryText }]}>
              {pendingApprovals.length === 1
                ? `${pendingApprovals[0].borrower_name} requested KES ${pendingApprovals[0].amount} in ${pendingApprovals[0].group_name}`
                : `${pendingApprovals.length} loan requests awaiting your decision`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primaryText} />
          </TouchableOpacity>
        )}

        {dueStatus.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Contributions Due</Text>
           {dueStatus.map((d: any) => (
  <TouchableOpacity
    key={d.groupId}
    style={[styles.rowCard, styles.loanRowCard, { backgroundColor: colors.surface }]}
    onPress={() => router.push({ pathname: '/group/[id]', params: { id: String(d.groupId), tab: 'contributions' } })}
  >
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowCardTitle, { color: colors.text }]}>{d.groupName}</Text>
      <Text style={[styles.rowCardSubtitle, { color: colors.textSecondary }]}>
        {d.paidSoFar > 0
          ? `KES ${d.remaining} remaining for ${formatCycleLabel(d.currentCycle)}`
          : `KES ${d.amount} due for ${formatCycleLabel(d.currentCycle)}`}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
  </TouchableOpacity>
))}
          </View>
        )}

        {targetProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Savings Target Progress</Text>
            {targetProgress.map((p: any) => {
              const pct = p.targetToDate > 0 ? Math.min((p.paidToDate / p.targetToDate) * 100, 100) : 0;
              return (
               <TouchableOpacity
  key={p.groupId}
  style={[styles.rowCard, styles.loanRowCard, { backgroundColor: colors.surface }]}
  onPress={() => router.push({ pathname: '/group/[id]', params: { id: String(p.groupId), tab: 'target' } })}
>
  <View style={{ flex: 1 }}>
    <View style={styles.progressHeaderRow}>
      <Text style={[styles.rowCardTitle, { color: colors.text }]}>{p.groupName}</Text>
      <Text style={[styles.progressStatus, { color: p.onTrack ? colors.success : colors.danger }]}>
        {p.onTrack ? 'ON TRACK' : `BEHIND KES ${p.shortfall}`}
      </Text>
    </View>
    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
    </View>
  </View>
  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
</TouchableOpacity>
              );
            })}
          </View>
        )}

        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 0 }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentActivity.map((item: any) => (
              <View key={item.id} style={[styles.activityRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name={(ACTIVITY_ICONS[item.action_type] || 'ellipse') as any} size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityDescription, { color: colors.text }]}>{item.description}</Text>
                  <Text style={[styles.activityDate, { color: colors.textMuted }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {latestNotification && (
          <TouchableOpacity
            style={[styles.rowCard, { backgroundColor: colors.surface, marginBottom: 20 }]}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.sectionHeaderRow}>
  <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 0 }]}>Latest Alert</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    {!latestNotification.is_read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
  </View>
</View>
            <Text style={[styles.rowCardTitle, { color: colors.text, marginTop: 6 }]}>{latestNotification.title}</Text>
            <Text style={[styles.rowCardSubtitle, { color: colors.textSecondary }]}>{latestNotification.message}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionHeader, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/create-group')}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/join-group')}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Join Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 26, fontWeight: 'bold' },
  subGreeting: { fontSize: 14, marginTop: 4 },
  headerIcons: { flexDirection: 'row', gap: 14 },
  iconButton: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 16 },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  rowCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  rowCardTitle: { fontSize: 15, fontWeight: '600' },
  rowCardSubtitle: { fontSize: 13, marginTop: 4 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressStatus: { fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  activityRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-start' },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  activityDescription: { fontSize: 13, fontWeight: '500' },
  activityDate: { fontSize: 11, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: { width: '47%', borderRadius: 12, padding: 20, alignItems: 'center' },
  actionText: { fontSize: 14, fontWeight: '600' },
  loanRowCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
