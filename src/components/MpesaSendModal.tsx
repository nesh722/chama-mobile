import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { getB2CStatus, sendMpesaB2C } from '../../services/mpesaB2CService';

export type MpesaSendRequest = {
  purpose: 'payout' | 'loan_disbursement';
  amount: number; // whole shillings
  recipientName: string;
  loanId?: number; // for a loan
  warning?: string; // extra line shown before sending
};

type Transfer = {
  id: number;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  fulfilled: boolean;
  needsAttention: boolean;
  receipt: string | null;
  message: string;
};

type Props = {
  request: MpesaSendRequest | null;
  groupId: string;
  sandbox: boolean;
  // called when the modal closes; the caller should reload because a transfer may have started
  onClose: () => void;
};

const POLL_EVERY_MS = 3000;
const SLOW_AFTER_MS = 90000;

export default function MpesaSendModal({ request, groupId, sandbox, onClose }: Props) {
  const { colors } = useAppTheme();

  const [phase, setPhase] = useState<'confirm' | 'waiting' | 'done'>('confirm');
  const [testPhone, setTestPhone] = useState('');
   const [showTestPhone, setShowTestPhone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [transferId, setTransferId] = useState<number | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [unclear, setUnclear] = useState('');
  const [slow, setSlow] = useState(false);

  // Start fresh every time the modal opens
  useEffect(() => {
    if (!request) return;
    setPhase('confirm');
    setTestPhone('');
    setShowTestPhone(false);
    setSending(false);
    setError('');
    setTransferId(null);
    setTransfer(null);
    setUnclear('');
    setSlow(false);
  }, [request]);

  // While waiting, ask the backend how the transfer is doing
  useEffect(() => {
    if (phase !== 'waiting' || transferId === null) return;

    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      try {
        const res = await getB2CStatus(transferId);
        if (cancelled) return;
        const t: Transfer = res.transfer;
        setTransfer(t);

        const settled =
          t.status === 'failed' ||
          t.status === 'timeout' ||
          (t.status === 'success' && (t.fulfilled || t.needsAttention));

        if (settled) {
          setPhase('done');
        } else if (Date.now() - startedAt > SLOW_AFTER_MS) {
          setSlow(true);
        }
      } catch {
        // a missed poll is fine, the next one will catch up
      }
    };

    tick();
    const timer = setInterval(tick, POLL_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, transferId]);

  if (!request) return null;

  const isPayout = request.purpose === 'payout';

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const res = await sendMpesaB2C({
        purpose: request.purpose,
        group_id: isPayout ? groupId : undefined,
        loan_id: isPayout ? undefined : request.loanId,
        phone: sandbox && testPhone.trim() ? testPhone.trim() : undefined
      });
      setTransferId(res.transferId);
      if (res.unclear) {
        setUnclear(res.message);
        setPhase('done');
      } else {
        setSlow(false);
        setPhase('waiting');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not start the transfer');
    } finally {
      setSending(false);
    }
  };

  const tryAgain = () => {
    setTransfer(null);
    setTransferId(null);
    setUnclear('');
    setError('');
    setPhase('confirm');
  };
  const renderConfirm = () => {
    const warnText = request.warning || (sandbox ? '' : "Real money, can't be undone");
    const warnTone = sandbox ? colors.textMuted : colors.warning;

    return (
      <>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + '1f' }]}>
          <Ionicons name="paper-plane" size={26} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{isPayout ? 'Send payout' : 'Send loan'}</Text>
        <Text style={[styles.amount, { color: colors.text }]}>KES {request.amount.toLocaleString()}</Text>

        <View style={[styles.recipient, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.recipientText, { color: colors.text }]} numberOfLines={1}>
            {request.recipientName}
          </Text>
        </View>

        <View style={styles.pills}>
          {sandbox && (
            <View style={[styles.pill, { backgroundColor: colors.primary + '1f' }]}>
              <Ionicons name="flask-outline" size={13} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary }]}>Test mode</Text>
            </View>
          )}
          {!!warnText && (
            <View style={[styles.pill, { backgroundColor: warnTone + '1f' }]}>
              <Ionicons name="information-circle-outline" size={13} color={warnTone} />
              <Text style={[styles.pillText, { color: warnTone }]}>{warnText}</Text>
            </View>
          )}
        </View>

        {sandbox &&
          (showTestPhone ? (
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={testPhone}
              onChangeText={setTestPhone}
              keyboardType="phone-pad"
              placeholder="Test number, e.g. 254708374149"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setShowTestPhone(true)} hitSlop={8}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Use a different test number</Text>
            </TouchableOpacity>
          ))}

        {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: sending ? 0.7 : 1 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={[styles.primaryText, { color: colors.primaryText }]}>Send now</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onClose} disabled={sending}>
          <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </>
    );
  };
  const renderWaiting = () => (
    <>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 14 }} />
      <Text style={[styles.title, { color: colors.text }]}>Sending...</Text>
      <Text style={[styles.detail, { color: colors.textSecondary }]}>
        Waiting for M-Pesa to confirm the transfer of KES {request.amount.toLocaleString()} to {request.recipientName}.
      </Text>
      {slow && (
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 12 }]}>
          This is taking longer than usual. You can close this safely. The result is recorded as soon as M-Pesa
          confirms, and the status shows on the screen.
        </Text>
      )}
      <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
        <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Close</Text>
      </TouchableOpacity>
    </>
  );

  const renderDone = () => {
    if (unclear) {
      return (
        <>
          <Ionicons name="alert-circle" size={56} color={colors.warning} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text style={[styles.title, { color: colors.text }]}>Not sure it went through</Text>
          <Text style={[styles.detail, { color: colors.textSecondary }]}>{unclear}</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={[styles.primaryText, { color: colors.primaryText }]}>Close</Text>
          </TouchableOpacity>
        </>
      );
    }

    const ok = transfer?.status === 'success' && transfer.fulfilled;
    const attention = transfer?.status === 'success' && !transfer.fulfilled;
    const icon = ok ? 'checkmark-circle' : attention ? 'alert-circle' : 'close-circle';
    const tone = ok ? colors.success : attention ? colors.warning : colors.danger;
    const heading = ok
      ? 'Sent'
      : attention
        ? 'Sent, but needs a look'
        : transfer?.status === 'timeout'
          ? 'Timed out, nothing sent'
          : 'Transfer failed';

    return (
      <>
        <Ionicons name={icon} size={56} color={tone} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={[styles.title, { color: colors.text }]}>{heading}</Text>
        {!!transfer?.message && <Text style={[styles.detail, { color: colors.textSecondary }]}>{transfer.message}</Text>}
        {!!transfer?.receipt && (
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>M-Pesa code: {transfer.receipt}</Text>
        )}

        {transfer?.status === 'failed' || transfer?.status === 'timeout' ? (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={tryAgain}>
              <Text style={[styles.primaryText, { color: colors.primaryText }]}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={[styles.primaryText, { color: colors.primaryText }]}>Done</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {phase === 'confirm' && renderConfirm()}
              {phase === 'waiting' && renderWaiting()}
              {phase === 'done' && renderDone()}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 14, padding: 20, width: '88%', maxWidth: 360 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  amount: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  detail: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  notice: { fontSize: 13, textAlign: 'center', marginTop: 14, lineHeight: 18 },
  label: { fontSize: 13, marginTop: 18, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10,  marginTop: 14 },
  hint: { fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  iconBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  recipient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, maxWidth: '100%' },
  recipientText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 9 },
  pillText: { fontSize: 12, fontWeight: '600' },
  linkText: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 14 },
  error: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  primaryButton: { padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  primaryText: { fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  secondaryText: { fontWeight: '600' }
});
