import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getProfile } from '../../../services/authService';
import { getMyContributions, getMyDueStatus } from '../../../services/contributionService';
import { getMyGroups, getMySavingsProgress } from '../../../services/groupService';
import { getMyLoans, getPendingApprovals } from '../../../services/loanService';
import { getPendingCashClaims } from '../../../services/cashClaimService';
import { getMyActivity } from '../../../services/activityService';
import { getMyNotifications } from '../../../services/notificationService';
import { getMySavings } from '../../../services/savingsService';
import { useAppTheme } from '../../../context/ThemeContext';
import { formatCycleLabel } from '../../../utils/formatCycleLabel';
import { ACTIVITY_ICONS } from '../../../utils/activityIcons';
import { formatMoney } from '../../../utils/describeInterest';
import { Avatar, GroupCarousel, GroupPickerSheet, GroupSaving, HeroCard, NextMeetingCard, PickGroup, QuickAction, QuickActionGrid, SectionHeader } from '../../components/HomeParts';
import { getUpcomingMeetings } from '../../../services/meetingService';
import { showAlert } from '../../../services/alertService';

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
  const [pendingCash, setPendingCash] = useState<any[]>([]); // cash members say they handed to me, waiting for my confirmation
  const [dueStatus, setDueStatus] = useState<any[]>([]);
  const [targetProgress, setTargetProgress] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [latestNotification, setLatestNotification] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openLoans, setOpenLoans] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [picker, setPicker] = useState<{ tab: string; action?: string; title: string; groups: PickGroup[] } | null>(null);
  const [scrolled, setScrolled] = useState(false);

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
      setMyGroups(groupsData.groups);
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
      try {
        const cashData = await getPendingCashClaims();
        setPendingCash(cashData.pending || []);
      } catch {
        setPendingCash([]); // cash confirmation is not set up on the server yet; the rest of the dashboard still loads
      }
      try {
        const meetingData = await getUpcomingMeetings();
        setUpcoming(meetingData.meetings || []);
      } catch {
        setUpcoming([]); // meetings are not set up on the server yet; the rest of Home still loads
      }
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

  const openGroup = (groupId: any, tab?: string, extra?: Record<string, string>) =>
    router.push({ pathname: '/group/[id]', params: { id: String(groupId), ...(tab ? { tab } : {}), ...(extra || {}) } });

  const goTo = (tab: string, action: string | undefined, g: PickGroup) =>
    openGroup(g.id, tab, { ...(action ? { action } : {}), ...(g.amount ? { amount: String(g.amount) } : {}) });

  const uniqGroups = (list: PickGroup[]) => list.filter((g, i) => list.findIndex((x) => String(x.id) === String(g.id)) === i);

  // One group to choose from: go straight in. Several: ask which. None known: all my groups.
  const pickGroup = (tab: string, title: string, candidates: PickGroup[], action?: string) => {
    const list = candidates.length > 0 ? candidates : myGroups.map((g: any) => ({ id: g.id, name: g.name }));
    if (list.length === 0) return router.push('/(tabs)/groups');
    if (list.length === 1) return goTo(tab, action, list[0]);
    setPicker({ tab, action, title, groups: list });
  };

  const openLoansAction = () =>
    pickGroup('loans', 'Open loans in which group?', uniqGroups(openLoans.map((l: any) => ({ id: l.group_id, name: l.group_name }))));

  const owedOf = (d: any) => (d.paidSoFar > 0 ? d.remaining : d.amount);

  const payNow = () => {
    const due = dueStatus.map((d: any) => ({
      id: d.groupId,
      name: d.groupName,
      subtitle: `KES ${Number(owedOf(d)).toLocaleString()} due`,
      amount: String(Number(owedOf(d)))
    }));
    if (due.length === 0) return showAlert('All paid up', 'You have no contributions due right now.');
    pickGroup('contributions', 'Pay which group?', due, 'pay');
  };

  const quickActions: QuickAction[] = [
    { icon: 'card-outline', label: 'Pay now', color: colors.primary, onPress: payNow },
    { icon: 'add-circle-outline', label: 'Request loan', color: colors.success, onPress: () => pickGroup('loans', 'Request a loan in which group?', [], 'request-loan') },
    { icon: 'trending-up-outline', label: 'Save extra', color: '#8b5cf6', onPress: () => pickGroup('target', 'Save extra in which group?', [], 'log-savings') },
    { icon: 'person-add-outline', label: 'Invite', color: colors.warning, onPress: () => pickGroup('overview', 'Invite to which group?', [], 'invite') }
  ];

  const groupSavings: GroupSaving[] = contributionsByGroup.map((g) => {
    const p = targetProgress.find((t: any) => t.groupName === g.groupName);
    const grp = myGroups.find((x: any) => x.name === g.groupName);
    return {
      groupId: grp?.id ?? p?.groupId,
      name: g.groupName,
      total: g.total,
      contributions: g.contributions,
      extra: g.extra,
      progress: p
        ? { pct: p.targetToDate > 0 ? Math.min((p.paidToDate / p.targetToDate) * 100, 100) : 0, onTrack: p.onTrack, shortfall: p.shortfall }
        : null
    };
  });

  return (
  <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
    {/* FIXED HEADER: outside the ScrollView, so it never scrolls */}
    <View
      style={[
        styles.topRow,
        {
          backgroundColor: colors.background,
          borderBottomColor: scrolled ? colors.border : 'transparent'
        }
      ]}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {user && <Avatar name={user.full_name} />}
        <View style={{ flex: 1 }}>
          <Text style={[styles.subGreeting, { color: colors.textSecondary, marginTop: 0 }]}>{getGreeting()} 👋</Text>
          <Text style={[styles.greeting, { color: colors.text, fontSize: 22 }]} numberOfLines={1}>
            {user ? user.full_name.split(' ')[0] : ''}
          </Text>
        </View>
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

    {/* SCROLLING BODY */}
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)}
    >

                <HeroCard
          total={totalContributed}
          groupCount={groupCount}
          activeLoans={activeLoanCount}
          owed={totalOwed}
          onPressLoans={openLoansAction}
        />
        <QuickActionGrid actions={quickActions} />
        <NextMeetingCard meetings={upcoming} onPress={(m) => openGroup(m.groupId, 'meetings')} />

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
          style={[styles.rowCard, styles.loanRowCard, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.warning }]}
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

          {groupSavings.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Savings by Group" actionLabel="All groups" onAction={() => router.push('/(tabs)/groups')} />
            <GroupCarousel
              items={groupSavings}
              onPress={(g) => (g.groupId ? openGroup(g.groupId) : router.push('/(tabs)/groups'))}
            />
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

        {pendingCash.length > 0 && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: '/group/[id]',
                params: { id: String(pendingCash[0].groupId), tab: pendingCash[0].kind === 'loan_repayment' ? 'loans' : 'contributions' }
              })
            }
          >
            <Ionicons name="cash-outline" size={20} color={colors.primaryText} />
            <Text style={[styles.bannerText, { color: colors.primaryText }]}>
              {pendingCash.length === 1
                ? `${pendingCash[0].payerName} says they handed you KES ${Number(pendingCash[0].claimedAmount).toLocaleString()} in cash (${pendingCash[0].groupName}). Tap to confirm`
                : `${pendingCash.length} cash payments awaiting your confirmation`}
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
    style={[styles.rowCard, styles.loanRowCard, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.warning }]}
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
        
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 0 }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
                        {recentActivity.map((item: any) => (
              <View
                key={item.id}
                style={[
                  styles.rowCard,
                  styles.loanRowCard,
                  { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.primary, alignItems: 'flex-start' }
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '1a' }]}>
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
            style={[styles.rowCard, { backgroundColor: colors.surface, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: latestNotification.is_read ? colors.border : colors.warning }]}
            onPress={() => router.push('/notifications')}
          >
            <View style={styles.sectionHeaderRow}>
  <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 0 }]}>Latest Alert</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    {!latestNotification.is_read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
  </View>
</View>
{!!latestNotification.group_name && (
  <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.primary, marginTop: 6 }}>
    {latestNotification.group_name}
  </Text>
)}
            <Text style={[styles.rowCardTitle, { color: colors.text, marginTop: 2 }]}>{latestNotification.title}</Text>
            <Text style={[styles.rowCardSubtitle, { color: colors.textSecondary }]}>{latestNotification.message}</Text>
          </TouchableOpacity>
        )}

               <Text style={[styles.sectionHeader, { color: colors.text }]}>Get Started</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 90 }}>
          <TouchableOpacity
            style={[styles.rowCard, { flex: 1, backgroundColor: colors.primary + '1a', borderWidth: 1, borderColor: colors.primary + '55', alignItems: 'center', paddingVertical: 20, marginBottom: 0 }]}
            onPress={() => router.push('/create-group')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '26', marginBottom: 8 }]}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Create Group</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Start a new chama</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowCard, { flex: 1, backgroundColor: colors.success + '1a', borderWidth: 1, borderColor: colors.success + '55', alignItems: 'center', paddingVertical: 20, marginBottom: 0 }]}
            onPress={() => router.push('/join-group')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrap, { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success + '26', marginBottom: 8 }]}>
              <Ionicons name="enter-outline" size={24} color={colors.success} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Join Group</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Use an invite link</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <>
      <GroupPickerSheet
        visible={picker !== null}
        title={picker?.title || ''}
        groups={picker?.groups || []}
        onPick={(g) => {
          const p = picker;
          setPicker(null);
          if (p) goTo(p.tab, p.action, g);
        }}
        onClose={() => setPicker(null)}
      />
      </>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingTop: 8,
  paddingBottom: 12,
  borderBottomWidth: StyleSheet.hairlineWidth
},
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
