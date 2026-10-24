import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet,
  Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import QRCode from 'react-native-qrcode-svg';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../services/alertService';
import { getGroupContributions, logContribution, sendContributionReminder } from '../../../services/contributionService';
import {
  changeRole,
  deleteGroup,
  getGroupDetails,
  getInviteToken,
  getSavingsProgress,
  getSavingsTargetHistory,
  regenerateInvite,
  removeMember,
  removeSavingsTarget,
  setSavingsTarget,
  updateGroup,
  updateLoanInterest,
} from '../../../services/groupService';
import { decideLoan, getGroupLoans, recordRepayment, requestLoan } from '../../../services/loanService';
import { getRotationHistory, getRotationStatus, markPayout, setupRotation } from '../../../services/payoutService';
import { getGroupSavings, logSavings } from '../../../services/savingsService';
import { getUser } from '../../../services/tokenService';
import { formatCycleLabel, getCycleProgress } from '../../../utils/formatCycleLabel';
import ReportsTab from '../../components/ReportsTab';
import { keyFor, isNoAnswer, PendingKey } from '../../../utils/requestKey';
import { SERVER_BASE_URL } from '../../../config/api';
import { describeInterest, describeInterestShort, formatMoney } from '../../../utils/describeInterest';

type TabKey = 'overview' | 'contributions' | 'loans' | 'payouts' | 'target' | 'reports';
const TAB_KEYS: TabKey[] = ['overview', 'contributions', 'loans', 'payouts', 'target', 'reports'];


export default function GroupDetailsScreen() {
  const { colors } = useAppTheme();
  const { id, tab } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>(
  TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'overview');

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [rotation, setRotation] = useState<any[]>([]);
  const [savingsData, setSavingsData] = useState<any>(null);
  const [savingsList, setSavingsList] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTabMenu, setShowTabMenu] = useState(false);

  const [showLogForm, setShowLogForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDueDate, setLoanDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [repayAmounts, setRepayAmounts] = useState<{ [key: number]: string }>({});

  const [settingUpRotation, setSettingUpRotation] = useState(false);
  const [markingPayout, setMarkingPayout] = useState(false);
  const [rotationHistory, setRotationHistory] = useState<any[]>([]);
const [showRotationHistory, setShowRotationHistory] = useState(false);

const [showTargetForm, setShowTargetForm] = useState(false);
const [targetAmount, setTargetAmount] = useState('');
const [settingTarget, setSettingTarget] = useState(false);
const [targetHistory, setTargetHistory] = useState<any[]>([]);
const [showTargetHistory, setShowTargetHistory] = useState(false);
const [showTargetMenu, setShowTargetMenu] = useState(false);

const [showEditGroupModal, setShowEditGroupModal] = useState(false);
const [editName, setEditName] = useState('');
const [editDescription, setEditDescription] = useState('');
const [editAmount, setEditAmount] = useState('');
const [editFrequency, setEditFrequency] = useState<'weekly' | 'monthly'>('monthly');
const [editSubmitting, setEditSubmitting] = useState(false);

const [showSavingsForm, setShowSavingsForm] = useState(false);
const [savingsAmount, setSavingsAmount] = useState('');
const [savingsNote, setSavingsNote] = useState('');
const [savingsSubmitting, setSavingsSubmitting] = useState(false);

const [roleModalMember, setRoleModalMember] = useState<{ id: number; name: string; currentRole: string } | null>(null);

const [showInvite, setShowInvite] = useState(false);
const [inviteToken, setInviteToken] = useState<string | null>(null);
const [loadingInvite, setLoadingInvite] = useState(false);
const [remindingId, setRemindingId] = useState<number | 'all' | null>(null);
const [showOwingModal, setShowOwingModal] = useState(false);
const [remindedIds, setRemindedIds] = useState<number[]>([]);



const pendingContribution = useRef<PendingKey>(null);
const pendingSavings = useRef<PendingKey>(null);
const pendingRepay = useRef<PendingKey>(null);
const pendingPayout = useRef<PendingKey>(null);
const [repayingId, setRepayingId] = useState<number | null>(null);

const [showInterestModal, setShowInterestModal] = useState(false);
const [interestRate, setInterestRate] = useState('');
const [interestPeriod, setInterestPeriod] = useState<'weekly' | 'monthly'>('monthly');
const [interestGrace, setInterestGrace] = useState('');
const [interestCap, setInterestCap] = useState('');
const [interestSaving, setInterestSaving] = useState(false);

  const isOverdue = (loan: any) => {
    if (loan.status !== 'approved' || !loan.due_date) return false;
    const due = new Date(loan.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const daysOverdue = (loan: any) => {
  const due = new Date(loan.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(Math.round((today.getTime() - due.getTime()) / 86400000), 1);
};

  const rotationComplete = rotation.length > 0 && rotation.every((r: any) => r.has_received);

  const rotationCycles: any[] = Object.values(
  rotationHistory.reduce((acc: any, row: any) => {
    if (!acc[row.cycle_number]) acc[row.cycle_number] = { cycle: row.cycle_number, rows: [] };
    acc[row.cycle_number].rows.push(row);
    return acc;
  }, {})
).sort((a: any, b: any) => b.cycle - a.cycle);

  const loadDetails = async () => {
    try {
  const data = await getGroupDetails(id as string);
      setGroup(data.group);
      setMembers(data.members);

  const contribData = await getGroupContributions(id as string);
      setContributions(contribData.contributions);

  const loanData = await getGroupLoans(id as string);
      setLoans(loanData.loans);

  const rotationData = await getRotationStatus(id as string);
      setRotation(rotationData.rotation);

  const rotationHistoryData = await getRotationHistory(id as string);
  setRotationHistory(rotationHistoryData.history);

  const progressData = await getSavingsProgress(id as string);
      setSavingsData(progressData);

  const savingsListData = await getGroupSavings(id as string);
      setSavingsList(savingsListData.savings);

  const historyData = await getSavingsTargetHistory(id as string);
      setTargetHistory(historyData.history);

  const user = await getUser();
      if (user) {
        setMyUserId(user.id);
        const me = data.members.find((m: any) => m.id === user.id);
        setMyRole(me?.role || null);
      }
    } catch (err: any) {
      console.log('Error loading group:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [id])
  );

  const reportActionError = (err: any, pending: { current: PendingKey }, what: string) => {
  if (err.response && err.response.status !== 409) {
    pending.current = null; // the server said no, so nothing was recorded
    showAlert('Error', err.response.data?.message || err.message);
  } else if (err.response) {
    showAlert('Please wait', err.response.data?.message || 'This is still being processed.');
  } else if (isNoAnswer(err)) {
    showAlert(
      'Could not confirm',
      `We couldn't confirm whether your ${what} went through. Check the list before trying again. Retrying the same action is safe and won't be counted twice.`
    );
    loadDetails();
  } else {
    showAlert('Error', err.message || 'Something went wrong');
  }
};

const handleLogContribution = async () => {
  const value = parseFloat(amount);
  if (!value || value <= 0) {
    showAlert('Missing Info', 'Enter an amount');
    return;
  }
  if (submitting) return;
  setSubmitting(true);
  const key = keyFor(pendingContribution, `contribution:${id}:${value}`);
  try {
    const result = await logContribution(id as string, value, key);
    pendingContribution.current = null;
    showAlert(
      result.duplicate ? 'Already recorded' : 'Success',
      result.duplicate
        ? 'This payment was already recorded earlier, so it was not added again.'
        : result.remaining > 0
          ? `Logged KES ${value}. KES ${result.remaining} is still remaining for this cycle.`
          : 'Contribution complete for this cycle'
    );
    setAmount('');
    setShowLogForm(false);
    loadDetails();
  } catch (err: any) {
    reportActionError(err, pendingContribution, 'payment');
  } finally {
    setSubmitting(false);
  }
};

const handleRemind = async (memberId?: number) => {
  setRemindingId(memberId ?? 'all');
  try {
    const result = await sendContributionReminder(id as string, memberId);
    if (memberId) {
      setRemindedIds((prev) => [...prev, memberId]);
    } else {
      setRemindedIds((prev) => Array.from(new Set([...prev, ...owingMembers.map((m) => m.id)])));
      showAlert(
        'Reminders sent',
        `${result.sent} member${result.sent === 1 ? '' : 's'} reminded.${result.skipped ? ` ${result.skipped} skipped (already reminded in the last 24 hours).` : ''}`
      );
    }
  } catch (err: any) {
    if (err.response?.status === 429) {
      // The server says they were already reminded in the last 24 hours, so the list should show that
      setRemindedIds((prev) =>
        Array.from(new Set([...prev, ...(memberId ? [memberId] : owingMembers.map((m) => m.id))]))
      );
      showAlert('Already reminded', err.response?.data?.message || 'Already reminded in the last 24 hours');
    } else {
      showAlert('Could not send', err.response?.data?.message || err.message);
    }
  } finally {
    setRemindingId(null);
  }
};

const handleOpenInterestSettings = () => {
  setInterestRate(String(parseFloat(group.late_interest_rate) || 0));
  setInterestPeriod(group.late_interest_period === 'weekly' ? 'weekly' : 'monthly');
  setInterestGrace(String(parseInt(group.late_interest_grace_days, 10) || 0));
  setInterestCap(String(parseFloat(group.late_interest_cap_percent) || 50));
  setShowInterestModal(true);
};

const handleSaveInterest = async () => {
  const rate = parseFloat(interestRate || '0');
  const grace = parseInt(interestGrace || '0', 10);
  const cap = parseFloat(interestCap || '50');
  if (isNaN(rate) || isNaN(grace) || isNaN(cap)) {
    showAlert('Check the values', 'Rate, grace days and cap must be numbers.');
    return;
  }
  setInterestSaving(true);
  try {
    await updateLoanInterest(id as string, rate, interestPeriod, grace, cap);
    showAlert(
      'Saved',
      rate > 0
        ? 'Late interest settings saved. They apply to loans requested from now on.'
        : 'Late interest is now off for new loans.'
    );
    setShowInterestModal(false);
    loadDetails();
  } catch (err: any) {
    showAlert('Error', err.response?.data?.message || err.message);
  } finally {
    setInterestSaving(false);
  }
};

const handleRequestLoan = async () => {
    if (!loanAmount) {
      showAlert('Missing Info', 'Enter a loan amount');
      return;
    }
    setLoanSubmitting(true);
    try {
      const dueDateString = loanDueDate.toISOString().split('T')[0];
      await requestLoan(id as string, parseFloat(loanAmount), dueDateString);
      showAlert('Success', 'Loan requested successfully');
      setLoanAmount('');
      setShowLoanForm(false);
      loadDetails();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoanSubmitting(false);
    }
  };

  const handleDecide = (loanId: number, decision: 'approved' | 'rejected') => {
    showConfirm(
      decision === 'approved' ? 'Approve Loan' : 'Reject Loan',
      `Are you sure you want to ${decision === 'approved' ? 'approve' : 'reject'} this loan?`,
      async () => {
        try {
          await decideLoan(loanId, decision);
          showAlert('Success', `Loan ${decision}`);
          loadDetails();
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      }
    );
  };

 const handleRepay = async (loanId: number) => {
  const value = parseFloat(repayAmounts[loanId] || '');
  if (!value || value <= 0) {
    showAlert('Missing Info', 'Enter a repayment amount');
    return;
  }
  if (repayingId !== null) return;
  setRepayingId(loanId);
  const key = keyFor(pendingRepay, `repay:${loanId}:${value}`);
  try {
    const result = await recordRepayment(loanId, value, key);
    pendingRepay.current = null;
    showAlert(
      result.duplicate ? 'Already recorded' : 'Success',
      result.duplicate
        ? 'This repayment was already recorded earlier, so it was not added again.'
        : result.loanRepaid
          ? 'Loan fully repaid. Well done!'
          : `Repayment recorded. KES ${result.remaining} left to repay.`
    );
    setRepayAmounts({ ...repayAmounts, [loanId]: '' });
    loadDetails();
  } catch (err: any) {
    reportActionError(err, pendingRepay, 'repayment');
  } finally {
    setRepayingId(null);
  }
};

  const handleSetupRotation = () => {
    showConfirm(
      rotationComplete ? 'Start New Cycle' : 'Set Up Rotation',
    rotationComplete
      ? 'This will save the completed rotation to history and start a new one using the current member order. Continue?'
      : 'This will set the rotation order to the current member list order. Continue?',
      async () => {
        setSettingUpRotation(true);
        try {
          const userOrder = members.map((m: any) => m.id);
          await setupRotation(id as string, userOrder);
          showAlert('Success', 'Rotation order set');
          loadDetails();
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        } finally {
          setSettingUpRotation(false);
        }
      }
    );
  };

  const handleMarkPayout = () => {
  showConfirm('Mark Payout', 'Mark the next member in rotation as paid out?', async () => {
    if (markingPayout) return;
    setMarkingPayout(true);
    const key = keyFor(pendingPayout, `payout:${id}`);
    try {
      const result = await markPayout(id as string, key);
      pendingPayout.current = null;
      showAlert(
        result.duplicate ? 'Already recorded' : 'Success',
        result.duplicate
          ? 'This payout was already recorded earlier, so it was not recorded again.'
          : `Payout of KES ${result.amount} recorded`
      );
      loadDetails();
    } catch (err: any) {
      reportActionError(err, pendingPayout, 'payout');
    } finally {
      setMarkingPayout(false);
    }
  });
};

  const handleSetTarget = async () => {
    if (!targetAmount) {
      showAlert('Missing Info', 'Enter a target amount');
      return;
    }
    setSettingTarget(true);
    try {
      await setSavingsTarget(id as string, parseFloat(targetAmount));
      showAlert('Success', 'Savings target set');
      setTargetAmount('');
      setShowTargetForm(false);
      loadDetails();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setSettingTarget(false);
    }
  };

  const handleRemoveTarget = () => {
    showConfirm(
      'Remove Savings Target',
      'This will remove the savings target for this group. Members will no longer see on-track/behind status. Continue?',
      async () => {
        try {
          await removeSavingsTarget(id as string);
          showAlert('Success', 'Savings target removed');
          loadDetails();
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      }
    );
  };

 const handleLogSavings = async () => {
  const value = parseFloat(savingsAmount);
  if (!value || value <= 0) {
    showAlert('Missing Info', 'Enter an amount to save');
    return;
  }
  if (savingsSubmitting) return;
  setSavingsSubmitting(true);
  const key = keyFor(pendingSavings, `savings:${id}:${value}:${savingsNote.trim()}`);
  try {
    const result = await logSavings(id as string, value, savingsNote || undefined, key);
    pendingSavings.current = null;
    showAlert(
      result.duplicate ? 'Already recorded' : 'Success',
      result.duplicate
        ? 'This deposit was already recorded earlier, so it was not added again.'
        : 'Savings logged successfully'
    );
    setSavingsAmount('');
    setSavingsNote('');
    setShowSavingsForm(false);
    loadDetails();
  } catch (err: any) {
    reportActionError(err, pendingSavings, 'deposit');
  } finally {
    setSavingsSubmitting(false);
  }
};
  const handleSelectRole = async (newRole: string) => {
    if (!roleModalMember) return;
    try {
      await changeRole(id as string, roleModalMember.id, newRole);
      showAlert('Success', `${roleModalMember.name} is now ${newRole}`);
      setRoleModalMember(null);
      loadDetails();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    }
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    showConfirm('Remove Member', `Remove ${memberName} from this group?`, async () => {
      try {
        await removeMember(id as string, memberId);
        showAlert('Success', 'Member removed');
        loadDetails();
      } catch (err: any) {
        showAlert('Error', err.response?.data?.message || err.message);
      }
    });
  };

  const handleDeleteGroup = () => {
    showConfirm(
      'Delete Group',
      `Are you absolutely sure you want to delete "${group.name}"? This cannot be undone.`,
      async () => {
        try {
          await deleteGroup(id as string);
          showAlert('Deleted', 'Group deleted successfully');
          router.replace('/(tabs)/groups');
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      }
    );
  };

  const handleOpenEditGroup = () => {
  setEditName(group.name);
  setEditDescription(group.description || '');
  setEditAmount(String(group.contribution_amount));
  setEditFrequency(group.contribution_frequency);
  setShowEditGroupModal(true);
};

const handleUpdateGroup = async () => {
  if (!editName || !editAmount) {
    showAlert('Missing Info', 'Name and contribution amount are required');
    return;
  }
  setEditSubmitting(true);
  try {
    await updateGroup(id as string, editName, editDescription, parseFloat(editAmount), editFrequency);
    showAlert('Success', 'Group updated successfully');
    setShowEditGroupModal(false);
    loadDetails();
  } catch (err: any) {
    showAlert('Error', err.response?.data?.message || err.message);
  } finally {
    setEditSubmitting(false);
  }
};

  const handleShowInvite = async () => {
    const next = !showInvite;
    setShowInvite(next);
    if (next && !inviteToken) {
      setLoadingInvite(true);
      try {
        const data = await getInviteToken(id as string);
        setInviteToken(data.invite_token);
      } catch (err: any) {
        showAlert('Error', err.response?.data?.message || err.message);
      } finally {
        setLoadingInvite(false);
      }
    }
  };

  const handleRegenerateInvite = () => {
    showConfirm(
      'Regenerate Invite Link',
      "This invalidates the old invite QR/link — anyone who hasn't joined yet using the old one will no longer be able to. Continue?",
      async () => {
        try {
          const data = await regenerateInvite(id as string);
          setInviteToken(data.invite_token);
          showAlert('Success', 'Invite link regenerated');
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      }
    );
  };

 const inviteLink = inviteToken ? `${SERVER_BASE_URL}/join/${inviteToken}` : '';

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    showAlert('Copied', 'Invite link copied to clipboard');
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({ message: `Join my chama "${group.name}" on Chama App: ${inviteLink}` });
    } catch {
      // user dismissed the share sheet -- nothing to do
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Group not found.</Text>
      </View>
    );
  }

  const canApprove = myRole === 'treasurer' || myRole === 'chair';
  
const myCycleRow = contributions.find((c: any) => c.user_id === myUserId && c.cycle_period === group.current_cycle);
const cycleTarget = parseFloat(group.contribution_amount);
const cyclePaid = myCycleRow ? parseFloat(myCycleRow.amount) : 0;
const cycleRemaining = myCycleRow?.status === 'paid' ? 0 : Math.max(cycleTarget - cyclePaid, 0);

const owingMembers = canApprove
  ? (members
      .filter((m: any) => m.id !== myUserId)
      .map((m: any) => {
        const row = contributions.find((c: any) => c.user_id === m.id && c.cycle_period === group.current_cycle);
        if (row?.status === 'paid') return null;
        const paid = row ? parseFloat(row.amount) : 0;
        return { id: m.id as number, name: m.full_name as string, paid, remaining: Math.max(cycleTarget - paid, 0) };
      })
      .filter(Boolean) as { id: number; name: string; paid: number; remaining: number }[])
      .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name))
  : [];

const pendingReminders = owingMembers.filter((m) => !remindedIds.includes(m.id));

const cycleProgress = getCycleProgress(group.current_cycle);
const daysLeftText = cycleProgress
  ? cycleProgress.daysLeft === 0
    ? 'last day'
    : `${cycleProgress.daysLeft} day${cycleProgress.daysLeft === 1 ? '' : 's'} left`
  : null;
const cycleProgressText = cycleProgress
  ? `Day ${cycleProgress.day} of ${cycleProgress.totalDays} · ${daysLeftText}`
  : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'contributions', label: 'Contributions' },
    { key: 'loans', label: 'Loans' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'target', label: 'Target' },
    { key: 'reports', label: 'Reports' }
  ];

  return (
 <>
   <Stack.Screen
  options={{
    headerTitleAlign: 'center',
    headerLeft: () => (
      <TouchableOpacity onPress={() => router.replace('/(tabs)/groups')} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 17, marginLeft: 2 }}>Back</Text>
      </TouchableOpacity>
    )
  }}
/>
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
            <View style={styles.headerBlock}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{group.description}</Text>
          </View>
          {canApprove && (
            <TouchableOpacity onPress={handleOpenEditGroup} hitSlop={8} style={{ paddingTop: 4 }}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
            <TouchableOpacity
        style={[styles.tabDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowTabMenu(true)}
      >
        <Text style={[styles.tabDropdownText, { color: colors.text }]}>
          {tabs.find((t) => t.key === activeTab)?.label}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <KeyboardAwareScrollView
  style={styles.container}
  keyboardShouldPersistTaps="handled"
  enableOnAndroid
  extraScrollHeight={20}
>
          <View>
            {activeTab === 'overview' && (
              <View>
                <Text style={[styles.detail, { color: colors.text }]}>
                  KES {group.contribution_amount} · {group.contribution_frequency}
                </Text>

                <TouchableOpacity onPress={handleShowInvite}>
                  <Text style={[styles.logToggle, { color: colors.primary, marginTop: 8 }]}>
                    {showInvite ? 'Hide Invite QR / Link' : 'Show Invite QR / Link'}
                  </Text>
                </TouchableOpacity>

                {showInvite && (
                  <View style={[styles.form, { backgroundColor: colors.surface, alignItems: 'center' }]}>
                    {loadingInvite ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <QRCode value={inviteLink} size={160} backgroundColor={colors.surface} color={colors.text} />
                        <TouchableOpacity onPress={handleCopyLink} style={{ marginTop: 10, alignItems: 'center' }}>
                          <Text selectable style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                            {inviteLink}
                          </Text>
                          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                            Tap to copy
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 14, alignSelf: 'stretch' }]}
                          onPress={handleShareInvite}
                        >
                          <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>Share Invite Link</Text>
                        </TouchableOpacity>
                        {canApprove && (
                          <TouchableOpacity onPress={handleRegenerateInvite} style={{ marginTop: 10 }}>
                            <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Regenerate Link</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                )}

                <Text style={[styles.sectionHeader, { color: colors.text }]}>Members</Text>
                {members.map((m: any) => (
                  <View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{m.full_name}</Text>
                    {canApprove && m.id !== myUserId ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity onPress={() => setRoleModalMember({ id: m.id, name: m.full_name, currentRole: m.role })}>
                          <Text style={[styles.memberRoleEditable, { color: colors.primary }]}>{m.role} ✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveMember(m.id, m.full_name)}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={[styles.memberRole, { color: colors.primary }]}>{m.role}</Text>
                    )}
                  </View>
                ))}
                {group.created_by === myUserId && (
                  <TouchableOpacity
                    style={[styles.deleteGroupButton, { backgroundColor: colors.dangerSurface }]}
                    onPress={handleDeleteGroup}
                  >
                    <Text style={[styles.deleteGroupButtonText, { color: colors.danger }]}>Delete Group</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'contributions' && (
              <View>
               <View style={styles.sectionHeaderRow}>
  <Text style={[styles.sectionHeader, { color: colors.text }]}>Contributions</Text>
  <TouchableOpacity onPress={() => { if (!submitting) setShowLogForm(!showLogForm); }}>
    <Text style={[styles.logToggle, { color: colors.primary }]}>
      {showLogForm ? 'Cancel' : '+ Log Contribution'}
    </Text>
  </TouchableOpacity>
</View>
                {showLogForm && (
                  <View style={[styles.form, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 12 }]}>
  {cycleRemaining === 0
    ? `Cycle complete (KES ${cyclePaid} paid)`
    : `Paid KES ${cyclePaid} of KES ${cycleTarget} · KES ${cycleRemaining} remaining`}
</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="Amount (KES)"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      placeholderTextColor={colors.placeholder}
                    />
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: colors.primary }]}
                      onPress={handleLogContribution}
                      disabled={submitting}
                    >
                      <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                        {submitting ? 'Saving...' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

{canApprove && owingMembers.length > 0 && (
  <TouchableOpacity
    style={[styles.owingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    onPress={() => setShowOwingModal(true)}
    activeOpacity={0.7}
  >
    <View style={[styles.owingIcon, { backgroundColor: colors.primary + '1a' }]}>
      <Ionicons name="notifications-outline" size={20} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.contribName, { color: colors.text }]}>Yet to pay this cycle</Text>
    <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
  KES {owingMembers.reduce((sum, m) => sum + m.remaining, 0).toLocaleString()} outstanding
  {daysLeftText ? ` · ${daysLeftText}` : ''}
</Text>
    </View>
    <View style={[styles.owingBadge, { backgroundColor: colors.danger }]}>
      <Text style={styles.owingBadgeText}>{owingMembers.length}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
  </TouchableOpacity>
)}

{canApprove && owingMembers.length === 0 && members.length > 1 && (
  <View style={[styles.owingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[styles.owingIcon, { backgroundColor: colors.success + '22' }]}>
      <Ionicons name="checkmark" size={20} color={colors.success} />
    </View>
    <Text style={[styles.contribName, { color: colors.text, flex: 1 }]}>Everyone else has paid in full this cycle</Text>
  </View>
)}

                {contributions.map((item: any) => (
                  <View key={item.id} style={[styles.contribRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.contribName, { color: colors.text }]}>{item.full_name}</Text>
                     <Text style={[styles.contribCycle, { color: colors.textMuted }]}>{formatCycleLabel(item.cycle_period)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.contribAmount, { color: colors.text }]}>KES {item.amount}</Text>
                      <Text style={[styles.contribStatus, { color: item.status === 'paid' ? colors.success : item.status === 'partial' ? colors.warning : colors.danger }]}>
  {item.status}
</Text>
{item.status === 'partial' && (
  <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
    KES {Math.max(parseFloat(group.contribution_amount) - parseFloat(item.amount), 0)} remaining
  </Text>
)}
                    </View>
                  </View>
                ))}
                {contributions.length === 0 && (
                  <Text style={[styles.empty, { color: colors.textMuted }]}>No contributions logged yet.</Text>
                )}
              </View>
            )}

            {activeTab === 'loans' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeader, { color: colors.text }]}>Loans</Text>
                  <TouchableOpacity onPress={() => setShowLoanForm(!showLoanForm)}>
                    <Text style={[styles.logToggle, { color: colors.primary }]}>
                      {showLoanForm ? 'Cancel' : '+ Request Loan'}
                    </Text>
                  </TouchableOpacity>
                </View>

               {(parseFloat(group.late_interest_rate) > 0 || canApprove) && (
  <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
    <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
    <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={2}>
      {parseFloat(group.late_interest_rate) > 0
        ? `Late interest ${describeInterestShort(group.late_interest_rate, group.late_interest_period, group.late_interest_grace_days)} · capped at ${parseFloat(group.late_interest_cap_percent) || 50}% of the loan`
        : 'Late interest is off for this group'}
    </Text>
    {canApprove && (
      <TouchableOpacity onPress={handleOpenInterestSettings} hitSlop={8}>
        <Text style={[styles.logToggle, { color: colors.primary }]}>
          {parseFloat(group.late_interest_rate) > 0 ? 'Edit' : 'Set up'}
        </Text>
      </TouchableOpacity>
    )}
  </View>
)}

                {showLoanForm && (
                  <View style={[styles.form, { backgroundColor: colors.surface }]}>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="Loan Amount (KES)"
                      value={loanAmount}
                      onChangeText={setLoanAmount}
                      keyboardType="numeric"
                      placeholderTextColor={colors.placeholder}
                    />

                    <TouchableOpacity
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, justifyContent: 'center' }]}
                      onPress={() => setShowDuePicker(true)}
                    >
                      <Text style={{ color: colors.text }}>Repay by: {loanDueDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showDuePicker && (
                      <DateTimePicker
                        value={loanDueDate}
                        mode="date"
                        minimumDate={new Date(Date.now() + 86400000)}
                        onChange={(event, selectedDate) => {
                          setShowDuePicker(false);
                          if (selectedDate) setLoanDueDate(selectedDate);
                        }}
                      />
                    )}

                    <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleRequestLoan} disabled={loanSubmitting}>
                      <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>{loanSubmitting ? 'Submitting...' : 'Submit Request'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {loans.map((loan: any) => {
  const overdue = isOverdue(loan);
  const statusLabel = overdue ? 'overdue' : loan.status;
  const statusColors: Record<string, string> = {
    approved: colors.success,
    repaid: colors.primary,
    requested: colors.warning,
    rejected: colors.danger,
    overdue: colors.danger
  };
  const tone = statusColors[statusLabel] || colors.textMuted;

  const hasInterest = parseFloat(loan.interestCharged) > 0;
  const interestUnpaid = parseFloat(loan.interestOutstanding) > 0;
  const owedTotal = parseFloat(loan.amount) + parseFloat(loan.interestCharged);
  const progress = owedTotal > 0 ? Math.min(parseFloat(loan.totalRepaid) / owedTotal, 1) : 0;

  return (
    <View key={loan.id} style={[styles.loanCard, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.loanRow}>
        <Text style={[styles.contribName, { color: colors.text }]}>{loan.full_name}</Text>
        <View style={[styles.statusPill, { backgroundColor: tone + '1f' }]}>
          <Text style={[styles.statusPillText, { color: tone }]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={[styles.loanPrincipal, { color: colors.text }]}>{formatMoney(loan.amount)}</Text>

      {!!loan.due_date && (
        <Text style={[styles.contribCycle, { color: overdue ? colors.danger : colors.textMuted }]}>
          {overdue
            ? `Overdue by ${daysOverdue(loan)} day${daysOverdue(loan) === 1 ? '' : 's'} · due ${new Date(loan.due_date).toLocaleDateString()}`
            : `Due ${new Date(loan.due_date).toLocaleDateString()}`}
        </Text>
      )}

      {loan.status === 'approved' && (
        <View style={[styles.breakdown, { borderTopColor: colors.border }]}>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Principal left</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>{formatMoney(loan.principalOutstanding)}</Text>
          </View>

          {hasInterest && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Late interest</Text>
              <Text style={[styles.breakdownValue, { color: interestUnpaid ? colors.danger : colors.success }]}>
                {interestUnpaid
                  ? `${formatMoney(loan.interestOutstanding)} unpaid`
                  : `${formatMoney(loan.interestCharged)} paid`}
              </Text>
            </View>
          )}

          <View style={styles.breakdownRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total outstanding</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(loan.totalOutstanding)}</Text>
          </View>

          {parseFloat(loan.totalRepaid) > 0 && (
            <>
              <View style={[styles.progressTrack, { backgroundColor: colors.border, marginTop: 8 }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.success }]} />
              </View>
              <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
                {formatMoney(loan.totalRepaid)} repaid so far
              </Text>
            </>
          )}

          {parseFloat(loan.interest_rate) > 0 && (
            <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
              Terms: {describeInterestShort(loan.interest_rate, loan.interest_period, loan.interest_grace_days)}
            </Text>
          )}
        </View>
      )}

      {loan.status === 'requested' && canApprove && loan.user_id !== myUserId && (
        <View style={styles.loanActions}>
          <TouchableOpacity style={[styles.approveButton, { backgroundColor: colors.success }]} onPress={() => handleDecide(loan.id, 'approved')}>
            <Text style={[styles.actionButtonText, { color: colors.primaryText }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.rejectButton, { backgroundColor: colors.danger }]} onPress={() => handleDecide(loan.id, 'rejected')}>
            <Text style={[styles.actionButtonText, { color: colors.primaryText }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {loan.status === 'approved' && (
        <View style={styles.repayRow}>
          <TextInput
            style={[styles.repayInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
            placeholder="Repay amount"
            keyboardType="numeric"
            value={repayAmounts[loan.id] || ''}
            onChangeText={(v) => setRepayAmounts({ ...repayAmounts, [loan.id]: v })}
            placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity
            style={[styles.submitButtonSmall, { backgroundColor: colors.primary }]}
            disabled={repayingId !== null}
            onPress={() => handleRepay(loan.id)}
          >
            <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
              {repayingId === loan.id ? '...' : 'Pay'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
})}
                {loans.length === 0 && <Text style={[styles.empty, { color: colors.textMuted }]}>No loans yet.</Text>}
              </View>
            )}

            {activeTab === 'payouts' && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeader, { color: colors.text }]}>Payout Rotation</Text>
                  {canApprove && (rotation.length === 0 || rotationComplete) && (
  <TouchableOpacity onPress={handleSetupRotation} disabled={settingUpRotation}>
    <Text style={[styles.logToggle, { color: colors.primary }]}>
      {settingUpRotation ? 'Setting up...' : rotation.length === 0 ? 'Set Up Rotation' : 'Start New Cycle'}
    </Text>
  </TouchableOpacity>
)}
                </View>

                {rotation.map((r: any) => (
                  <View key={r.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {r.rotation_order}. {r.full_name}
                    </Text>
                    <Text style={[styles.contribStatus, { color: r.has_received ? colors.success : colors.danger }]}>
                      {r.has_received ? 'RECEIVED' : 'PENDING'}
                    </Text>
                  </View>
                ))}
                {rotation.length === 0 && <Text style={[styles.empty, { color: colors.textMuted }]}>No rotation set up yet.</Text>}

                {canApprove && rotation.length > 0 && rotation.some((r: any) => !r.has_received) && (
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                    onPress={handleMarkPayout}
                    disabled={markingPayout}
                  >
                    <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                      {markingPayout ? 'Processing...' : 'Mark Next Payout'}
                    </Text>
                  </TouchableOpacity>
                )}

                {rotationCycles.length > 0 && (
  <View style={{ marginTop: 20 }}>
    <TouchableOpacity onPress={() => setShowRotationHistory(!showRotationHistory)}>
      <Text style={[styles.logToggle, { color: colors.primary }]}>
        {showRotationHistory
          ? 'Hide Payout History'
          : `View Payout History (${rotationCycles.length} past ${rotationCycles.length === 1 ? 'cycle' : 'cycles'})`}
      </Text>
    </TouchableOpacity>

    {showRotationHistory && rotationCycles.map((c: any) => (
      <View key={c.cycle} style={{ marginTop: 12 }}>
        <Text style={[styles.sectionHeader, { color: colors.text, fontSize: 15 }]}>
          Cycle {c.cycle}
        </Text>
        {c.rows.map((r: any) => (
          <View key={r.id} style={[styles.contribRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.contribName, { color: colors.text }]}>
                {r.rotation_order}. {r.full_name}
              </Text>
              {r.received_at && (
                <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
                  {new Date(r.received_at).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {r.has_received && r.amount != null && (
                <Text style={[styles.contribAmount, { color: colors.text }]}>KES {r.amount}</Text>
              )}
              <Text style={[styles.contribStatus, { color: r.has_received ? colors.success : colors.textMuted }]}>
                {r.has_received ? 'RECEIVED' : 'NOT PAID'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    ))}
  </View>
)}
              </View>
            )}

            {activeTab === 'target' && (
              <View>
            <View style={styles.sectionHeaderRow}>
  <Text style={[styles.sectionHeader, { color: colors.text }]}>Savings Target</Text>
  {showTargetForm ? (
    <TouchableOpacity onPress={() => setShowTargetForm(false)}>
      <Text style={[styles.logToggle, { color: colors.primary }]}>Cancel</Text>
    </TouchableOpacity>
  ) : (
    canApprove && (
      <TouchableOpacity onPress={() => setShowTargetMenu(true)} hitSlop={8}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    )
  )}
</View>

                {showTargetForm && (
                  <View style={[styles.form, { backgroundColor: colors.surface }]}>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="Target per member (KES)"
                      value={targetAmount}
                      onChangeText={setTargetAmount}
                      keyboardType="numeric"
                      placeholderTextColor={colors.placeholder}
                    />
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: colors.primary }]}
                      onPress={handleSetTarget}
                      disabled={settingTarget}
                    >
                      <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                        {settingTarget ? 'Saving...' : 'Set Target'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {savingsData?.targetSet ? (
                  <>
                    <Text style={[styles.detail, { color: colors.text }]}>
                      KES {savingsData.savingsTarget} per cycle · {savingsData.cyclesElapsed} cycles elapsed
                    </Text>
                    <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 8 }]}>
                      Progress below includes both regular contributions and extra savings
                    </Text>
                    {savingsData.progress.map((p: any) => (
                      <View key={p.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                        <View>
                          <Text style={[styles.memberName, { color: colors.text }]}>{p.full_name}</Text>
                          <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
                            Paid KES {p.paidToDate} of KES {p.targetToDate}
                          </Text>
                        </View>
                        <Text style={[styles.contribStatus, { color: p.onTrack ? colors.success : colors.danger }]}>
                          {p.onTrack ? 'ON TRACK' : `BEHIND KES ${p.shortfall}`}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={[styles.empty, { color: colors.textMuted }]}>No savings target set for this group yet.</Text>
                )}

                {targetHistory.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <TouchableOpacity onPress={() => setShowTargetHistory(!showTargetHistory)}>
                      <Text style={[styles.logToggle, { color: colors.primary }]}>
                        {showTargetHistory ? 'Hide Target History' : `View Target History (${targetHistory.length})`}
                      </Text>
                    </TouchableOpacity>

                    {showTargetHistory && targetHistory.map((h: any) => (
                      <View key={h.id} style={[styles.contribRow, { borderBottomColor: colors.border }]}>
                        <View>
                          <Text style={[styles.contribName, { color: colors.text }]}>KES {h.savings_target} per cycle</Text>
                          <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
                            {new Date(h.target_start_date).toLocaleDateString()} – {new Date(h.target_end_date).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={[styles.contribStatus, { color: colors.textMuted }]}>
                          {h.ended_reason === 'replaced' ? 'REPLACED' : 'REMOVED'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                  <Text style={[styles.sectionHeader, { color: colors.text }]}>Extra Savings</Text>
                  <TouchableOpacity onPress={() => setShowSavingsForm(!showSavingsForm)}>
                    <Text style={[styles.logToggle, { color: colors.primary }]}>
                      {showSavingsForm ? 'Cancel' : '+ Log Savings'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showSavingsForm && (
                  <View style={[styles.form, { backgroundColor: colors.surface }]}>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="Amount (KES)"
                      value={savingsAmount}
                      onChangeText={setSavingsAmount}
                      keyboardType="numeric"
                      placeholderTextColor={colors.placeholder}
                    />
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="Note (optional)"
                      value={savingsNote}
                      onChangeText={setSavingsNote}
                      placeholderTextColor={colors.placeholder}
                    />
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: colors.primary }]}
                      onPress={handleLogSavings}
                      disabled={savingsSubmitting}
                    >
                      <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                        {savingsSubmitting ? 'Saving...' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {savingsList.map((item: any) => (
                  <View key={item.id} style={[styles.contribRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.contribName, { color: colors.text }]}>{item.full_name}</Text>
                      {item.note && <Text style={[styles.contribCycle, { color: colors.textMuted }]}>{item.note}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.contribAmount, { color: colors.text }]}>KES {item.amount}</Text>
                      <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
                        {new Date(item.deposited_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
                {savingsList.length === 0 && (
                  <Text style={[styles.empty, { color: colors.textMuted }]}>No extra savings logged yet.</Text>
                )}
              </View>
            )}
                        {activeTab === 'reports' && (
              <ReportsTab groupId={id as string} groupName={group.name} />
            )}
          </View>
      </KeyboardAwareScrollView>

      <Modal
        visible={roleModalMember !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Role</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{roleModalMember?.name}</Text>

            {['chair', 'treasurer', 'secretary', 'member']
              .filter((r) => r !== roleModalMember?.currentRole)
              .map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => handleSelectRole(r)}
                >
                  <Text style={[styles.roleOptionText, { color: colors.primary }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}

            <TouchableOpacity style={styles.modalCancel} onPress={() => setRoleModalMember(null)}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
            <Modal
        visible={showTabMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTabMenu(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTabMenu(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Jump to section</Text>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.roleOption,
                  { backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceAlt }
                ]}
                onPress={() => {
                  setActiveTab(tab.key);
                  setShowTabMenu(false);
                }}
              >
                <Text style={[
                  styles.roleOptionText,
                  { color: activeTab === tab.key ? colors.primaryText : colors.primary }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTabMenu(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

            <Modal visible={showTargetMenu} transparent animationType="fade" onRequestClose={() => setShowTargetMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTargetMenu(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Savings Target</Text>
            <TouchableOpacity
              style={[styles.roleOption, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => { setShowTargetMenu(false); setShowTargetForm(!showTargetForm); }}
            >
              <Text style={[styles.roleOptionText, { color: colors.primary }]}>
                {savingsData?.targetSet ? 'Update Target' : 'Set Target'}
              </Text>
            </TouchableOpacity>
            {savingsData?.targetSet && (
              <TouchableOpacity
                style={[styles.roleOption, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setShowTargetMenu(false); handleRemoveTarget(); }}
              >
                <Text style={[styles.roleOptionText, { color: colors.danger }]}>Remove Target</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowTargetMenu(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

           <Modal
  visible={showEditGroupModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowEditGroupModal(false)}
>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Group
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                  marginTop: 12,
                },
              ]}
              placeholder="Group Name"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="Description (optional)"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="Contribution Amount (KES)"
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholderTextColor={colors.placeholder}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {(['weekly', 'monthly'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    {
                      flex: 1,
                      borderWidth: 1,
                      padding: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      borderColor: colors.border,
                    },
                    editFrequency === f && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setEditFrequency(f)}
                >
                  <Text
                    style={{
                      color:
                        editFrequency === f
                          ? colors.primaryText
                          : colors.text,
                      fontWeight: '600',
                    }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdateGroup}
              disabled={editSubmitting}
            >
              <Text
                style={[styles.submitButtonText, { color: colors.primaryText }]}
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowEditGroupModal(false)}
            >
              <Text
                style={[styles.modalCancelText, { color: colors.textMuted }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>

<Modal visible={showOwingModal} transparent animationType="slide" onRequestClose={() => setShowOwingModal(false)}>
  <View style={styles.sheetOverlay}>
    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowOwingModal(false)} />
    <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

      <View style={styles.sheetHeader}>
        <View style={{ flex: 1 }}>
  <Text style={[styles.sheetTitle, { color: colors.text }]}>Yet to pay</Text>
  <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
    {formatCycleLabel(group.current_cycle)}
  </Text>
  {!!cycleProgressText && (
    <Text
      style={[
        styles.contribCycle,
        {
          color: cycleProgress && cycleProgress.daysLeft <= 2 ? colors.danger : colors.textMuted,
          fontWeight: '600'
        }
      ]}
    >
      {cycleProgressText}
    </Text>
  )}
</View>
        <TouchableOpacity onPress={() => setShowOwingModal(false)} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
        {owingMembers.length === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Everyone has paid in full.</Text>
        )}
        {owingMembers.map((m) => {
          const reminded = remindedIds.includes(m.id);
          const initials = m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
          return (
            <View key={m.id} style={[styles.owingRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '1a' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: colors.text }]}>{m.name}</Text>
                <Text style={[styles.contribCycle, { color: colors.textMuted }]}>
                  {m.paid > 0
                    ? `Paid KES ${m.paid.toLocaleString()} · KES ${m.remaining.toLocaleString()} remaining`
                    : `KES ${m.remaining.toLocaleString()} due`}
                </Text>
              </View>
              {reminded ? (
                <Text style={[styles.remindPillText, { color: colors.success }]}>Reminded ✓</Text>
              ) : (
                <TouchableOpacity
                  style={[styles.remindPill, { borderColor: colors.primary }]}
                  disabled={remindingId !== null}
                  onPress={() => handleRemind(m.id)}
                >
                  <Text style={[styles.remindPillText, { color: colors.primary }]}>
                    {remindingId === m.id ? 'Sending...' : 'Remind'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {owingMembers.length > 0 && (
        <TouchableOpacity
          style={[
            styles.remindAllButton,
            { backgroundColor: pendingReminders.length === 0 ? colors.border : colors.primary }
          ]}
          disabled={remindingId !== null || pendingReminders.length === 0}
          onPress={() =>
            showConfirm(
              'Remind everyone',
              `Send a reminder to ${pendingReminders.length} member${pendingReminders.length === 1 ? '' : 's'}?`,
              () => handleRemind()
            )
          }
        >
          <Text style={[styles.submitButtonText, { color: pendingReminders.length === 0 ? colors.textMuted : colors.primaryText }]}>
            {remindingId === 'all'
              ? 'Sending...'
              : pendingReminders.length === 0
                ? 'Everyone reminded'
                : `Remind all (${pendingReminders.length})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
</Modal>
<Modal visible={showInterestModal} transparent animationType="fade" onRequestClose={() => setShowInterestModal(false)}>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Late loan interest</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Applies to loans requested from now on. Set the rate to 0 to turn it off.
            </Text>

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 6 }]}>Rate (% per period)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
              placeholderTextColor={colors.placeholder}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {(['weekly', 'monthly'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    { flex: 1, borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center', borderColor: colors.border },
                    interestPeriod === p && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setInterestPeriod(p)}
                >
                  <Text style={{ color: interestPeriod === p ? colors.primaryText : colors.text, fontWeight: '600' }}>
                    {p === 'weekly' ? 'Per week' : 'Per month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 6 }]}>Grace days after the due date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={interestGrace}
              onChangeText={setInterestGrace}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 6 }]}>Cap (% of the loan)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={interestCap}
              onChangeText={setInterestCap}
              keyboardType="decimal-pad"
              placeholder="50"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 12 }]}>
              {describeInterest(interestRate, interestPeriod, interestGrace, interestCap)}
            </Text>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveInterest}
              disabled={interestSaving}
            >
              <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
                {interestSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowInterestModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { marginTop: 4 },
  detail: { fontSize: 14, marginBottom: 4, marginTop: 8 },
  sectionHeader: { fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  logToggle: { fontWeight: '600' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  memberName: { fontSize: 15 },
  memberRole: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  memberRoleEditable: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize', textDecorationLine: 'underline' },
  form: { padding: 16, borderRadius: 10, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  submitButton: { padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonSmall: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { fontWeight: '600' },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  contribName: { fontSize: 15, fontWeight: '500' },
  contribCycle: { fontSize: 13, marginTop: 2 },
  contribAmount: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  contribStatus: { fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  empty: { textAlign: 'center', marginTop: 12, marginBottom: 12 },
  loanCard: { borderRadius: 10, padding: 14, marginBottom: 10 },
  loanRow: { flexDirection: 'row', justifyContent: 'space-between' },
  loanActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveButton: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  rejectButton: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { fontWeight: '600' },
  repayRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  repayInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { borderRadius: 14, padding: 20, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  roleOption: { paddingVertical: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  roleOptionText: { fontSize: 15, fontWeight: '600' },
  modalCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  modalCancelText: { fontWeight: '600' },
  deleteGroupButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  deleteGroupButtonText: { fontWeight: '600' },
    tabDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  tabDropdownText: { fontSize: 15, fontWeight: '600' },
  owingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 12, marginBottom: 8 },
owingIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
owingBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
owingBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '80%' },
sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
sheetTitle: { fontSize: 20, fontWeight: 'bold' },
owingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
avatarText: { fontWeight: '700', fontSize: 14 },
remindPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
remindPillText: { fontSize: 13, fontWeight: '600' },
remindAllButton: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 10 },
infoText: { flex: 1, fontSize: 12 },
statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
loanPrincipal: { fontSize: 22, fontWeight: '700', marginTop: 6 },
breakdown: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
breakdownLabel: { fontSize: 13 },
breakdownValue: { fontSize: 13, fontWeight: '600' },
totalLabel: { fontSize: 14, fontWeight: '700' },
totalValue: { fontSize: 16, fontWeight: '700' },
progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
progressFill: { height: 6, borderRadius: 3 }
});
