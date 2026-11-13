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
import { getGroupContributions, sendContributionReminder } from '../../../services/contributionService';
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
import { decideLoan, getGroupLoans, requestLoan } from '../../../services/loanService';
import {
  cancelPayoutApproval,
  decidePayoutApproval,
  getPayoutApproval,
  getRotationHistory,
  getRotationStatus,
  markPayout,
  requestPayoutApproval,
  setupRotation
} from '../../../services/payoutService';
import { getGroupSavings, logSavings } from '../../../services/savingsService';
import { getUser } from '../../../services/tokenService';
import { formatCycleLabel, getCycleProgress } from '../../../utils/formatCycleLabel';
import ReportsTab from '../../components/ReportsTab';
import MeetingsTab from '../../components/MeetingsTab';
import MpesaPayModal, { MpesaRequest } from '../../components/MpesaPayModal';
import CashClaimModal, { Approver, CashRequest } from '../../components/CashClaimModal';
import CashReviewModal from '../../components/CashReviewModal';
import { cancelCashClaim, dismissCashClaim, getCashClaims } from '../../../services/cashClaimService';
import MpesaSendModal, { MpesaSendRequest } from '../../components/MpesaSendModal';
import { getB2CTransfers, releaseB2C } from '../../../services/mpesaB2CService';
import { keyFor, isNoAnswer, PendingKey } from '../../../utils/requestKey';
import { SERVER_BASE_URL } from '../../../config/api';
import { describeInterest, describeInterestShort, formatMoney } from '../../../utils/describeInterest';

type TabKey = 'overview' | 'contributions' | 'loans' | 'payouts' | 'target' | 'reports' | 'meetings';
const TAB_KEYS: TabKey[] = ['overview', 'contributions', 'loans', 'payouts', 'target', 'reports', 'meetings'];

const MAX_RATE_BY_PERIOD = { weekly: 5, monthly: 20 } as const;
const MAX_INTEREST_CAP = 100;
const MAX_GRACE_DAYS = 30;

// Keeps only digits (and one decimal point), limits the decimals, and ignores
// a keystroke that would push the value over the maximum
const limitNumber = (text: string, prev: string, max: number, decimals = 2) => {
  let t = text.replace(decimals > 0 ? /[^0-9.]/g : /[^0-9]/g, '');
  const dot = t.indexOf('.');
  if (dot !== -1) {
    t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  }
  if (t !== '' && t !== '.' && parseFloat(t) > max) return prev;
  return t;
};


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

const [mpesaRequest, setMpesaRequest] = useState<MpesaRequest | null>(null);

// M-Pesa B2C: sending payouts and loans out
const [b2cTransfers, setB2cTransfers] = useState<any[]>([]);
const [b2cSandbox, setB2cSandbox] = useState(false);
const [b2cReady, setB2cReady] = useState(false);
const [payoutApprovalInfo, setPayoutApprovalInfo] = useState<any>(null); // null = the server has no payout approvals yet
const [payoutApprovalBusy, setPayoutApprovalBusy] = useState(false);
const [cashClaims, setCashClaims] = useState<any[]>([]); // cash payments waiting for / decided by a treasurer or chair
const [cashRequest, setCashRequest] = useState<CashRequest | null>(null);
const [reviewClaim, setReviewClaim] = useState<any>(null);
const [sendRequest, setSendRequest] = useState<MpesaSendRequest | null>(null);

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
const maxInterestRate = MAX_RATE_BY_PERIOD[interestPeriod];

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

      try {
        const b2cData = await getB2CTransfers(id as string);
        setB2cTransfers(b2cData.transfers || []);
        setB2cSandbox(!!b2cData.sandbox);
        setB2cReady(true);
      } catch {
        setB2cReady(false); // sending money by M-Pesa is not set up on the server yet
      }

      try {
        setPayoutApprovalInfo(await getPayoutApproval(id as string));
      } catch {
        setPayoutApprovalInfo(null); // payout approvals are not set up on the server yet
      }

      try {
        const claimData = await getCashClaims(id as string);
        setCashClaims(claimData.claims || []);
      } catch {
        setCashClaims([]); // cash confirmation is not set up on the server yet
      }

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

// Cash is never recorded on the payer's word alone: they ask the treasurer / chair who got it to confirm.
const handleCashContribution = () => {
  const value = parseFloat(amount);
  if (!value || value <= 0) {
    showAlert('Missing Info', 'Enter an amount');
    return;
  }
  setCashRequest({
    kind: 'contribution',
    amount: value,
    title: 'Cash contribution',
    detail: cycleRemaining > 0 ? `KES ${cycleRemaining.toLocaleString()} remaining this cycle` : undefined
  });
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
  if (rate < 0 || rate > maxInterestRate) {
  showAlert('Check the rate', `The ${interestPeriod} rate must be between 0 and ${maxInterestRate}%.`);
  return;
}
  if (rate > 0 && (cap <= 0 || cap > MAX_INTEREST_CAP)) {
  showAlert('Check the cap', `The cap must be between 1 and ${MAX_INTEREST_CAP}% of the loan.`);
  return;
  }
  if (grace < 0 || grace > MAX_GRACE_DAYS) {
  showAlert('Check the grace days', `Grace days must be between 0 and ${MAX_GRACE_DAYS}.`);
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

const handleCashRepay = (loan: any) => {
  const outstanding = parseFloat(loan.totalOutstanding);
  if (!(outstanding > 0)) {
    showAlert('Nothing to pay', 'This loan has nothing left to pay.');
    return;
  }
  const typed = (repayAmounts[loan.id] || '').trim();
  const n = typed === '' ? outstanding : parseFloat(typed);
  if (!n || n <= 0) {
    showAlert('Missing Info', 'Enter a repayment amount');
    return;
  }
  if (n > outstanding + 1e-9) {
    showAlert('Too much', `The most you can pay is KES ${outstanding.toLocaleString()}.`);
    return;
  }
  setCashRequest({
    kind: 'loan_repayment',
    amount: Math.round(n * 100) / 100,
    loanId: loan.id,
    maxAmount: outstanding,
    title: 'Cash loan repayment',
    detail: `KES ${outstanding.toFixed(2)} outstanding`
  });
};

const handleCashClosed = (sent: boolean, receiverName?: string) => {
  const req = cashRequest;
  setCashRequest(null);
  if (sent && req) {
    if (req.kind === 'contribution') {
      setAmount('');
      setShowLogForm(false);
    } else if (req.loanId !== undefined) {
      const loanId = req.loanId;
      setRepayAmounts((prev) => ({ ...prev, [loanId]: '' }));
    }
    showAlert(
      'Sent for confirmation',
      `${receiverName || 'The treasurer'} has been asked to confirm they received your cash. It will be recorded as soon as they do.`
    );
  }
  loadDetails();
};

const handleCancelClaim = (claim: any) => {
  showConfirm('Cancel Cash Payment', 'Cancel this cash payment? Nothing has been recorded yet.', async () => {
    try {
      await cancelCashClaim(claim.id);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    }
    loadDetails();
  });
};

// The X on a confirmed / rejected answer: hide it right away, and remember it on the server
const handleDismissClaim = async (claim: any) => {
  setCashClaims((prev) => prev.map((c: any) => (c.id === claim.id ? { ...c, dismissed: true } : c)));
  try {
    await dismissCashClaim(claim.id);
  } catch {
    loadDetails(); // it could not be saved, so show what the server has
  }
};

const handleReviewClosed = (changed: boolean) => {
  setReviewClaim(null);
  if (changed) loadDetails();
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

  // ----- second approver for payouts -----
  const runApprovalAction = async (action: () => Promise<any>, doneTitle: string, doneMessage: string) => {
    if (payoutApprovalBusy) return;
    setPayoutApprovalBusy(true);
    try {
      await action();
      showAlert(doneTitle, doneMessage);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setPayoutApprovalBusy(false);
      loadDetails();
    }
  };

  const handleRequestPayoutApproval = () =>
    runApprovalAction(
      () => requestPayoutApproval(id as string),
      'Requested',
      'Another treasurer or chair has been asked to approve this payout.'
    );

  const handleDecidePayout = (decision: 'approved' | 'rejected') => {
    const info = payoutApprovalInfo;
    if (!info?.approval || !info?.turn) return;
    const what = `KES ${Number(info.approval.amount).toLocaleString()} to ${info.turn.recipientName}`;
    showConfirm(
      decision === 'approved' ? 'Approve Payout' : 'Reject Payout',
      decision === 'approved' ? `Approve paying ${what}?` : `Reject paying ${what}?`,
      () => runApprovalAction(
        () => decidePayoutApproval(info.approval.id, decision),
        decision === 'approved' ? 'Approved' : 'Rejected',
        decision === 'approved' ? 'The payout can now be paid out.' : 'The payout was rejected.'
      )
    );
  };

  const handleCancelPayoutApproval = () => {
    const info = payoutApprovalInfo;
    if (!info?.approval) return;
    showConfirm(
      'Cancel Approval',
      info.approval.status === 'approved'
        ? 'Take back this approval? The payout will need to be requested and approved again.'
        : 'Withdraw this payout request?',
      () => runApprovalAction(() => cancelPayoutApproval(info.approval.id), 'Cancelled', 'The payout request was cancelled.')
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
  // ---- M-Pesa ----
  // STK push only moves whole shillings
  const wholeShillings = (raw: string) => {
    const text = raw.trim();
    const n = Number(text);
    return text !== '' && Number.isInteger(n) && n >= 1 ? n : null;
  };

  const showWholeShillingsAlert = () =>
    showAlert('Whole shillings only', 'M-Pesa payments must be a whole number of shillings, for example 500.');

  const handleMpesaContribution = () => {
    const n = wholeShillings(amount);
    if (n === null) {
      showWholeShillingsAlert();
      return;
    }
    setMpesaRequest({
      purpose: 'contribution',
      amount: n,
      title: 'Pay contribution',
      detail: cycleRemaining > 0 ? `KES ${cycleRemaining.toLocaleString()} remaining this cycle` : undefined
    });
  };

  const handleMpesaSavings = () => {
    const n = wholeShillings(savingsAmount);
    if (n === null) {
      showWholeShillingsAlert();
      return;
    }
    setMpesaRequest({
      purpose: 'savings',
      amount: n,
      title: 'Save with M-Pesa',
      detail: 'Goes into your Extra Savings',
      note: savingsNote.trim() || undefined
    });
  };

  const handleMpesaRepay = (loan: any) => {
    const outstanding = parseFloat(loan.totalOutstanding);
    // The most M-Pesa can take is the balance rounded UP to the next whole shilling
    const cap = Math.ceil(outstanding - 1e-9);
    if (!(cap >= 1)) {
      showAlert('Nothing to pay', 'This loan has nothing left to pay.');
      return;
    }

    const typed = (repayAmounts[loan.id] || '').trim();
    const n = typed === '' ? cap : wholeShillings(typed);
    if (n === null) {
      showWholeShillingsAlert();
      return;
    }
    if (n > cap) {
      showAlert('Too much', `The most you can pay is KES ${cap.toLocaleString()}.`);
      return;
    }

    const left = Math.round((outstanding - n) * 100) / 100;
    setMpesaRequest({
      purpose: 'loan_repayment',
      amount: n,
      loanId: loan.id,
      title: 'Repay loan',
      detail:
        left < 0
          ? `This clears your loan. The extra KES ${Math.abs(left).toFixed(2)} goes to your Extra Savings.`
          : left === 0
            ? 'This clears your loan.'
            : `KES ${left.toFixed(2)} will still be outstanding.`
    });
  };

  const handleMpesaClosed = (paid: boolean) => {
    const req = mpesaRequest;
    setMpesaRequest(null);
    if (paid && req) {
      if (req.purpose === 'contribution') {
        setAmount('');
        setShowLogForm(false);
      } else if (req.purpose === 'savings') {
        setSavingsAmount('');
        setSavingsNote('');
        setShowSavingsForm(false);
      } else if (req.loanId !== undefined) {
        const loanId = req.loanId;
        setRepayAmounts((prev) => ({ ...prev, [loanId]: '' }));
      }
    }
    loadDetails();
  };

  // ---- M-Pesa B2C (sending money out) ----
  const b2cFor = (purpose: 'payout' | 'loan_disbursement', refId: number) =>
    b2cTransfers.find((t: any) => t.purpose === purpose && Number(t.referenceId) === Number(refId)) || null;

  const handleSendNextPayout = () => {
    const turn = rotation.find((r: any) => !r.has_received);
    if (!turn) return;
    const total = parseFloat(group.contribution_amount) * members.length;
    if (!Number.isInteger(total) || total < 1) {
      showAlert(
        'Whole shillings only',
        `This payout is KES ${total}. M-Pesa can only send whole shillings, so record it with Mark Next Payout instead.`
      );
      return;
    }
    setSendRequest({ purpose: 'payout', amount: total, recipientName: turn.full_name });
  };

  const handleSendLoan = (loan: any) => {
    const n = parseFloat(loan.amount);
    if (!Number.isInteger(n) || n < 1) {
      showAlert('Whole shillings only', `This loan is KES ${n}. M-Pesa can only send whole shillings, so hand it over another way.`);
      return;
    }
    setSendRequest({
      purpose: 'loan_disbursement',
      amount: n,
      recipientName: loan.full_name,
      loanId: loan.id,
      warning: b2cSandbox
        ? "Only send this if the loan hasn't already been handed over. Sandbox mode: no real money moves."
        : "Only send this if the loan hasn't already been handed over. This sends real money and cannot be undone."
    });
  };

  const handleSendClosed = () => {
    setSendRequest(null);
    loadDetails();
  };

  const handleReleaseTransfer = (transfer: any) => {
    showConfirm(
      'Release transfer',
      'Only do this if you have checked your M-Pesa statement and no money was sent. Releasing lets you send it again. Continue?',
      async () => {
        try {
          const result = await releaseB2C(transfer.id);
          showAlert('Released', result.message || 'You can send it again.');
          loadDetails();
        } catch (err: any) {
          showAlert('Error', err.response?.data?.message || err.message);
        }
      }
    );
  };

  // Status card for a transfer that is in flight, failed, or needs attention
  const renderTransferCard = (t: any) => {
    const tone = t.needsAttention ? colors.danger : t.stale ? colors.warning : colors.textSecondary;
    return (
      <View style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: tone }]}>
        <Text style={[styles.transferText, { color: tone }]}>{t.message}</Text>
        {t.stale && canApprove && (
          <TouchableOpacity onPress={() => handleReleaseTransfer(t)} hitSlop={8}>
            <Text style={[styles.logToggle, { color: colors.primary, marginTop: 8 }]}>Release and try again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Who has to approve the next payout, and where that stands
  const renderPayoutApproval = () => {
    const info = payoutApprovalInfo;
    if (!info || !info.turn || !canApprove) return null;
    const a = info.approval;
    const amountText = `KES ${Number(info.turn.amount).toLocaleString()}`;
    const who = `${amountText} to ${info.turn.recipientName}`;

    let tone = colors.textSecondary;
    let message = '';
    if (info.paused) {
      tone = colors.warning;
      message = `Payouts are paused: this group has ${info.approverCount} of ${info.minApprovers} required approvers. Make another member a treasurer or chair so a second person can approve each payout.`;
    } else if (!a) {
      message = `Next payout: ${who}. Another treasurer or chair has to approve it before it can be paid.`;
    } else if (a.status === 'requested') {
      message = a.canDecide
        ? `${a.requestedByName || 'A treasurer'} asked to pay ${who}. Please review and decide.`
        : `Waiting for another treasurer or chair to approve paying ${who}.`;
    } else if (a.status === 'approved') {
      tone = a.outdated ? colors.warning : colors.success;
      message = a.outdated
        ? `The payout amount changed since this was approved. Cancel it and ask for approval again.`
        : `Approved by ${a.decidedByName || 'another approver'}: ${who}. You can pay it out now.`;
    } else if (a.status === 'rejected') {
      tone = colors.danger;
      message = `${a.decidedByName || 'Another approver'} rejected paying ${who}. You can ask again if things changed.`;
    }

    const canAsk = !info.paused && (!a || a.status === 'rejected');
    return (
      <View style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: tone }]}>
        <Text style={[styles.noticeTitle, { color: colors.text }]}>Payout approval</Text>
        <Text style={[styles.transferText, { color: tone }]}>{message}</Text>

        {canAsk && (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 10, opacity: payoutApprovalBusy ? 0.6 : 1 }]}
            onPress={handleRequestPayoutApproval}
            disabled={payoutApprovalBusy}
          >
            <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>Ask for approval</Text>
          </TouchableOpacity>
        )}

        {a?.canDecide && (
          <View style={styles.approvalActions}>
            <TouchableOpacity
              style={[styles.submitButton, { flex: 1, backgroundColor: colors.success, opacity: payoutApprovalBusy ? 0.6 : 1 }]}
              onPress={() => handleDecidePayout('approved')}
              disabled={payoutApprovalBusy}
            >
              <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { flex: 1, backgroundColor: colors.danger, opacity: payoutApprovalBusy ? 0.6 : 1 }]}
              onPress={() => handleDecidePayout('rejected')}
              disabled={payoutApprovalBusy}
            >
              <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {a?.canCancel && (
          <TouchableOpacity onPress={handleCancelPayoutApproval} hitSlop={8} disabled={payoutApprovalBusy}>
            <Text style={[styles.logToggle, { color: colors.primary, marginTop: 10 }]}>
              {a.status === 'approved' ? 'Take back approval' : 'Cancel request'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Cash payments waiting for a treasurer / chair to confirm, plus the latest answers for the person who paid
  const renderCashClaims = (kind: 'contribution' | 'loan_repayment', loanId?: number) => {
    const ofKind = cashClaims.filter((c: any) => c.kind === kind && (loanId === undefined || c.loanId === loanId));
    const pending = ofKind.filter((c: any) => c.status === 'pending');
    const recentlyDecided = ofKind
      .filter(
        (c: any) =>
          (c.status === 'confirmed' || c.status === 'rejected') &&
          c.payerId === myUserId &&
          !c.dismissed &&
          c.decidedAt &&
          Date.now() - new Date(c.decidedAt).getTime() < 3 * 24 * 60 * 60 * 1000
      )
      .slice(0, 2);
    const shown = [...pending, ...recentlyDecided];
    if (shown.length === 0) return null;

    return (
      <View>
        {shown.map((c: any) => {
          let tone = colors.textSecondary;
          let message = '';
          if (c.status === 'pending' && c.canConfirm) {
            tone = colors.warning;
            message = `${c.payerName} says they handed you KES ${Number(c.claimedAmount).toLocaleString()} in cash. Confirm what you received.`;
          } else if (c.status === 'pending') {
            tone = colors.warning;
            message = `Waiting for ${c.receiverName} to confirm your KES ${Number(c.claimedAmount).toLocaleString()} cash payment. It is recorded once they do.`;
          } else if (c.status === 'confirmed') {
            tone = colors.success;
            message =
              c.confirmedAmount !== null && c.confirmedAmount !== c.claimedAmount
                ? `${c.receiverName} confirmed KES ${Number(c.confirmedAmount).toLocaleString()} (you said KES ${Number(c.claimedAmount).toLocaleString()}).`
                : `${c.receiverName} confirmed your KES ${Number(c.claimedAmount).toLocaleString()} cash payment.`;
          } else {
            tone = colors.danger;
            message = `${c.receiverName} did not confirm your KES ${Number(c.claimedAmount).toLocaleString()} cash payment.${c.rejectReason ? ` Reason: “${c.rejectReason}”` : ''}`;
          }
          return (
            <View key={c.id} style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: tone, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.transferText, { color: tone }]}>{message}</Text>
                {c.canConfirm && (
                  <TouchableOpacity onPress={() => setReviewClaim(c)} hitSlop={8}>
                    <Text style={[styles.logToggle, { color: colors.primary, marginTop: 8 }]}>Review</Text>
                  </TouchableOpacity>
                )}
                {c.canCancel && (
                  <TouchableOpacity onPress={() => handleCancelClaim(c)} hitSlop={8}>
                    <Text style={[styles.logToggle, { color: colors.primary, marginTop: 8 }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
              {c.status !== 'pending' && (
                <TouchableOpacity onPress={() => handleDismissClaim(c)} hitSlop={10} accessibilityLabel="Dismiss">
                  <Ionicons name="close" size={20} color={tone} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // The M-Pesa part of an approved loan card
  const renderLoanSend = (loan: any) => {
    const t = b2cFor('loan_disbursement', loan.id);
    const mine = loan.user_id === myUserId;

    if (t && t.status === 'success' && t.fulfilled) {
      return (
        <Text style={[styles.contribCycle, { color: colors.success }]}>
          {mine ? 'Sent to your M-Pesa' : 'Sent via M-Pesa'}
          {t.receipt ? ` · ${t.receipt}` : ''}
        </Text>
      );
    }
    if (mine || !canApprove) return null;

    // Once repayments exist, the money has obviously already changed hands
    if (!t && parseFloat(loan.totalRepaid) > 0) return null;

    const busy = !!t && (t.status === 'pending' || t.status === 'success');
    return (
      <View>
        {t && renderTransferCard(t)}
        {!busy && (
          <TouchableOpacity
            style={[styles.mpesaButton, { borderColor: colors.primary }]}
            onPress={() => handleSendLoan(loan)}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
            <Text style={[styles.submitButtonText, { color: colors.primary }]}>
              Send KES {parseFloat(loan.amount).toLocaleString()} via M-Pesa
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
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
const canRemind = canApprove || myRole === 'secretary';
const approverCount: number = group.approver_count ?? 0;
const minApprovers: number = group.min_approvers ?? 2;
const loansPaused = approverCount < minApprovers;
const nextTurn = rotation.find((r: any) => !r.has_received);
const nextTransfer = nextTurn ? b2cFor('payout', nextTurn.id) : null;
const nextTransferBusy = !!nextTransfer && (nextTransfer.status === 'pending' || (nextTransfer.status === 'success' && !nextTransfer.fulfilled));
// A payout can only be paid once a different treasurer / chair approved this exact payout.
// If the server has no payout approvals yet (payoutApprovalInfo is null) the old behaviour stays.
// Treasurers / chairs (other than me) who can confirm that I handed them cash
const cashApprovers: Approver[] = members
  .filter((m: any) => (m.role === 'treasurer' || m.role === 'chair') && m.id !== myUserId)
  .map((m: any) => ({ id: m.id, name: m.full_name, role: m.role }));
const payoutApproved = payoutApprovalInfo
  ? !payoutApprovalInfo.paused && payoutApprovalInfo.approval?.status === 'approved' && !payoutApprovalInfo.approval?.outdated
  : true;
  
const myCycleRow = contributions.find((c: any) => c.user_id === myUserId && c.cycle_period === group.current_cycle);
const cycleTarget = parseFloat(group.contribution_amount);
const cyclePaid = myCycleRow ? parseFloat(myCycleRow.amount) : 0;
const cycleRemaining = myCycleRow?.status === 'paid' ? 0 : Math.max(cycleTarget - cyclePaid, 0);

const owingMembers = canRemind
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
    { key: 'meetings', label: 'Meetings' },
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
                {loansPaused && canApprove && (
  <Text style={[styles.contribCycle, { color: colors.warning, marginBottom: 6 }]}>
    {approverCount} of {minApprovers} required approvers. Tap a member's role to make them treasurer or a second chair.
  </Text>
)}
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
      {showLogForm ? 'Cancel' : '+ Pay Contribution'}
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
                      onPress={handleCashContribution}
                      disabled={submitting}
                    >
                      <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>I paid cash</Text>
                    </TouchableOpacity>
                    <Text style={[styles.contribCycle, { color: colors.textMuted, marginTop: 6 }]}>
                      Cash only counts once the treasurer or chair who received it confirms.
                    </Text>
                    <TouchableOpacity
                      style={[styles.mpesaButton, { borderColor: colors.primary }]}
                      onPress={handleMpesaContribution}
                      disabled={submitting}
                    >
                      <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                      <Text style={[styles.submitButtonText, { color: colors.primary }]}>Pay with M-Pesa</Text>
                    </TouchableOpacity>
                  </View>
                )}

{renderCashClaims('contribution')}

{canRemind && owingMembers.length > 0 && (
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

{canRemind && owingMembers.length === 0 && members.length > 1 && (
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
                  {!loansPaused && (
  <TouchableOpacity onPress={() => setShowLoanForm(!showLoanForm)}>
    <Text style={[styles.logToggle, { color: colors.primary }]}>
      {showLoanForm ? 'Cancel' : '+ Request Loan'}
    </Text>
  </TouchableOpacity>
)}
</View>

 {loansPaused && (
      <View style={[styles.noticeCard, { backgroundColor: colors.warning + '1f', borderColor: colors.warning }]}>
        <Ionicons name="shield-outline" size={20} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>Loans are paused</Text>
          <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>
            {canApprove
              ? `This group has ${approverCount} of ${minApprovers} required approvers. Make another member a treasurer or chair to turn loans on.`
              : 'Loans are paused until the group has a second treasurer or chair. Ask your group leaders to assign one.'}
          </Text>
          {canApprove && (
            <TouchableOpacity onPress={() => setActiveTab('overview')} hitSlop={8}>
              <Text style={[styles.logToggle, { color: colors.primary, marginTop: 6 }]}>
                Go to members
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )}

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

      <Text style={[styles.contribAmount, { color: colors.text }]}>{formatMoney(loan.amount)}</Text>

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

      {loan.status === 'approved' && b2cReady && renderLoanSend(loan)}

      {loan.status === 'approved' && loan.user_id === myUserId && (
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
            onPress={() => handleCashRepay(loan)}
          >
            <Text style={[styles.submitButtonText, { color: colors.primaryText }]}>
              Cash
            </Text>
          </TouchableOpacity>
          {loan.user_id === myUserId && (
            <TouchableOpacity
              style={[styles.mpesaSmall, { borderColor: colors.primary }]}
              disabled={repayingId !== null}
              onPress={() => handleMpesaRepay(loan)}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
              <Text style={[styles.submitButtonText, { color: colors.primary }]}>M-Pesa</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loan.status === 'approved' && loan.user_id === myUserId && (
        <Text style={[styles.contribCycle, { color: colors.textMuted, marginTop: 6 }]}>
          Cash only counts once the treasurer or chair who received it confirms.
        </Text>
      )}
      {renderCashClaims('loan_repayment', loan.id)}
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

                {rotation.length > 0 && rotation.some((r: any) => !r.has_received) && renderPayoutApproval()}

                {canApprove && payoutApproved && rotation.length > 0 && rotation.some((r: any) => !r.has_received) && (
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

                {canApprove && b2cReady && nextTurn && (
                  <View>
                    {nextTransfer && renderTransferCard(nextTransfer)}
                    {!nextTransferBusy && payoutApproved && (
                      <TouchableOpacity
                        style={[styles.mpesaButton, { borderColor: colors.primary }]}
                        onPress={handleSendNextPayout}
                      >
                        <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                        <Text style={[styles.submitButtonText, { color: colors.primary }]}>Send Next Payout via M-Pesa</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                    <TouchableOpacity
                      style={[styles.mpesaButton, { borderColor: colors.primary }]}
                      onPress={handleMpesaSavings}
                      disabled={savingsSubmitting}
                    >
                      <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                      <Text style={[styles.submitButtonText, { color: colors.primary }]}>Save with M-Pesa</Text>
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

     {activeTab === 'meetings' && <MeetingsTab groupId={id as string} />}

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

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 6 }]}>
  Rate (% per {interestPeriod === 'weekly' ? 'week' : 'month'}, max {maxInterestRate})
</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={interestRate}
               onChangeText={(t) => setInterestRate((prev) => limitNumber(t, prev, maxInterestRate))}
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
                  onPress={() => {
  setInterestPeriod(p);
  const max = MAX_RATE_BY_PERIOD[p];
  if (parseFloat(interestRate) > max) setInterestRate(String(max));
}}
                >
                  <Text style={{ color: interestPeriod === p ? colors.primaryText : colors.text, fontWeight: '600' }}>
                    {p === 'weekly' ? 'Per week' : 'Per month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 6 }]}>
              Grace days after the due date (max {MAX_GRACE_DAYS})
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={interestGrace}
              onChangeText={(t) => setInterestGrace((prev) => limitNumber(t, prev, MAX_GRACE_DAYS))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.contribCycle, { color: colors.textMuted, marginBottom: 6 }]}>
              Cap (% of the loan, max {MAX_INTEREST_CAP})
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={interestCap}
              onChangeText={(t) => setInterestCap((prev) => limitNumber(t, prev, MAX_INTEREST_CAP))}
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

<MpesaPayModal request={mpesaRequest} groupId={id as string} onClose={handleMpesaClosed} />
<CashClaimModal request={cashRequest} approvers={cashApprovers} groupId={id as string} onClose={handleCashClosed} />
<CashReviewModal claim={reviewClaim} onClose={handleReviewClosed} />
<MpesaSendModal request={sendRequest} groupId={id as string} sandbox={b2cSandbox} onClose={handleSendClosed} />
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
statusPillText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
breakdown: { marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
breakdownLabel: { fontSize: 13 },
breakdownValue: { fontSize: 13, fontWeight: '600' },
totalLabel: { fontSize: 15, fontWeight: '600' },
totalValue: { fontSize: 15, fontWeight: '700' },
progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
progressFill: { height: 6, borderRadius: 3 },
noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 4, marginBottom: 10 },
noticeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
noticeBody: { fontSize: 13, lineHeight: 18 },
mpesaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 10 },
mpesaSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
transferCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
transferText: { fontSize: 13, lineHeight: 18 },
approvalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
