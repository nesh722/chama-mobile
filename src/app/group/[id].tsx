import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal,  Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { showAlert, showConfirm } from '../../../services/alertService';
import { getGroupContributions, logContribution } from '../../../services/contributionService';
import {
  changeRole,
  getGroupDetails,
  getSavingsProgress,
  setSavingsTarget,
  removeSavingsTarget,
  getSavingsTargetHistory,
  getInviteToken,
  regenerateInvite
} from '../../../services/groupService';
import { logSavings, getGroupSavings } from '../../../services/savingsService';
import { decideLoan, getGroupLoans, recordRepayment, requestLoan } from '../../../services/loanService';
import { getRotationStatus, markPayout, setupRotation } from '../../../services/payoutService';
import { getUser } from '../../../services/tokenService';
import { removeMember, deleteGroup } from '../../../services/groupService';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ReportsTab from '../../components/ReportsTab';

type TabKey = 'overview' | 'contributions' | 'loans' | 'payouts' | 'target' | 'reports';


const APP_SCHEME = 'mobile';

function getCurrentCycleLabel(frequency: string) {
  const now = new Date();
  if (frequency === 'weekly') {
    const target = new Date(now.valueOf());
    const dayNr = (now.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  } else {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
export default function GroupDetailsScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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

  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [settingTarget, setSettingTarget] = useState(false);
  const [targetHistory, setTargetHistory] = useState<any[]>([]);
  const [showTargetHistory, setShowTargetHistory] = useState(false);
  const [showTargetMenu, setShowTargetMenu] = useState(false);

  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsNote, setSavingsNote] = useState('');
  const [savingsSubmitting, setSavingsSubmitting] = useState(false);

  const [roleModalMember, setRoleModalMember] = useState<{ id: number; name: string; currentRole: string } | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  const isOverdue = (loan: any) => {
    if (loan.status !== 'approved' || !loan.due_date) return false;
    const due = new Date(loan.due_date);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

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

  const handleLogContribution = async () => {
  if (!amount) {
    showAlert('Missing Info', 'Enter an amount');
    return;
  }
  setSubmitting(true);
  try {
    await logContribution(id as string, parseFloat(amount));
    showAlert('Success', 'Contribution logged successfully');
    setAmount('');
    setShowLogForm(false);
    loadDetails();
  } catch (err: any) {
    showAlert('Error', err.response?.data?.message || err.message);
  } finally {
    setSubmitting(false);
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
    const value = repayAmounts[loanId];
    if (!value) {
      showAlert('Missing Info', 'Enter a repayment amount');
      return;
    }
    try {
      await recordRepayment(loanId, parseFloat(value));
      showAlert('Success', 'Repayment recorded');
      setRepayAmounts({ ...repayAmounts, [loanId]: '' });
      loadDetails();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    }
  };

  const handleSetupRotation = () => {
    showConfirm(
      'Set Up Rotation',
      'This will set the rotation order to the current member list order. Continue?',
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
      setMarkingPayout(true);
      try {
        const result = await markPayout(id as string);
        showAlert('Success', `Payout of KES ${result.amount} recorded`);
        loadDetails();
      } catch (err: any) {
        showAlert('Error', err.response?.data?.message || err.message);
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
    if (!savingsAmount) {
      showAlert('Missing Info', 'Enter an amount to save');
      return;
    }
    setSavingsSubmitting(true);
    try {
      await logSavings(id as string, parseFloat(savingsAmount), savingsNote || undefined);
      showAlert('Success', 'Savings logged successfully');
      setSavingsAmount('');
      setSavingsNote('');
      setShowSavingsForm(false);
      loadDetails();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
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

  const inviteLink = inviteToken ? `${APP_SCHEME}://join/${inviteToken}` : '';

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
        <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{group.description}</Text>
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
  <TouchableOpacity onPress={() => setShowLogForm(!showLogForm)}>
    <Text style={[styles.logToggle, { color: colors.primary }]}>
      {showLogForm ? 'Cancel' : '+ Log Contribution'}
    </Text>
  </TouchableOpacity>
</View>
                {showLogForm && (
                  <View style={[styles.form, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 12 }]}>
  Logging for cycle: {getCurrentCycleLabel(group.contribution_frequency)}
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

                {contributions.map((item: any) => (
                  <View key={item.id} style={[styles.contribRow, { borderBottomColor: colors.border }]}>
                    <View>
                      <Text style={[styles.contribName, { color: colors.text }]}>{item.full_name}</Text>
                      <Text style={[styles.contribCycle, { color: colors.textMuted }]}>{item.cycle_period}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.contribAmount, { color: colors.text }]}>KES {item.amount}</Text>
                      <Text
                        style={[
                          styles.contribStatus,
                          { color: item.status === 'paid' ? colors.success : colors.danger }
                        ]}
                      >
                        {item.status}
                      </Text>
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
                  const loanStatusColor: Record<string, string> = {
                    approved: colors.success,
                    repaid: colors.primary,
                    requested: colors.warning,
                    rejected: colors.danger
                  };
                  return (
                    <View key={loan.id} style={[styles.loanCard, { backgroundColor: colors.surfaceAlt }]}>
                      <View style={styles.loanRow}>
                        <Text style={[styles.contribName, { color: colors.text }]}>{loan.full_name}</Text>
                        <Text style={[styles.contribStatus, { color: loanStatusColor[loan.status] || colors.danger }]}>
                          {loan.status}
                        </Text>
                      </View>
                      <Text style={[styles.contribAmount, { color: colors.text }]}>
                        KES {loan.amount}
                        {loan.status === 'approved' && ` (Repaid: KES ${loan.totalRepaid} of ${loan.amount})`}
                      </Text>
                      {loan.due_date && (
                        <Text style={[styles.contribCycle, { color: isOverdue(loan) ? colors.danger : colors.textMuted }]}>
                          {isOverdue(loan) ? 'OVERDUE — ' : ''}Due {new Date(loan.due_date).toLocaleDateString()}
                        </Text>
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
                          <TouchableOpacity style={[styles.submitButtonSmall, { backgroundColor: colors.primary }]} onPress={() => handleRepay(loan.id)}>
                            <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>Pay</Text>
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
                  {canApprove && rotation.length === 0 && (
                    <TouchableOpacity onPress={handleSetupRotation} disabled={settingUpRotation}>
                      <Text style={[styles.logToggle, { color: colors.primary }]}>
                        {settingUpRotation ? 'Setting up...' : 'Set Up Rotation'}
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
              <ReportsTab groupId={id as string} />
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
  tabDropdownText: { fontSize: 15, fontWeight: '600' }
});
