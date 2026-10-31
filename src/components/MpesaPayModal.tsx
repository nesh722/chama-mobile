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
import { getMpesaStatus, startMpesaPayment } from '../../services/mpesaService';
import { getUser } from '../../services/tokenService';

export type MpesaRequest = {
  purpose: 'contribution' | 'savings' | 'loan_repayment';
  amount: number; // whole shillings
  title: string;
  detail?: string; // extra line under the amount
  loanId?: number;
  note?: string;
};

type Payment = {
  id: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  fulfilled: boolean;
  needsAttention: boolean;
  receipt: string | null;
  amount: number;
  message: string;
};

type Props = {
  request: MpesaRequest | null;
  groupId: string;
  // paid = true when M-Pesa took the money (so the caller can clear its form)
  onClose: (paid: boolean) => void;
};

const POLL_EVERY_MS = 3000;
const SLOW_AFTER_MS = 90000;

export default function MpesaPayModal({ request, groupId, onClose }: Props) {
  const { colors } = useAppTheme();

  const [phase, setPhase] = useState<'form' | 'waiting' | 'done'>('form');
  const [phone, setPhone] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [slow, setSlow] = useState(false);

  // Start fresh every time the modal opens, and prefill the phone from the account
  useEffect(() => {
    if (!request) return;
    setPhase('form');
    setError('');
    setPaymentId(null);
    setPayment(null);
    setSlow(false);
    setStarting(false);

    let alive = true;
    (async () => {
      try {
        const user = await getUser();
        if (alive && user?.phone) setPhone(String(user.phone));
      } catch {
        // no saved phone: the member types one
      }
    })();
    return () => {
      alive = false;
    };
  }, [request]);

  // While waiting, ask the backend how the payment is doing
  useEffect(() => {
    if (phase !== 'waiting' || paymentId === null) return;

    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      try {
        const res = await getMpesaStatus(paymentId);
        if (cancelled) return;
        const p: Payment = res.payment;
        setPayment(p);

        const settled =
          p.status === 'failed' ||
          p.status === 'cancelled' ||
          (p.status === 'success' && (p.fulfilled || p.needsAttention));

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
  }, [phase, paymentId]);

  if (!request) return null;

  const handleSend = async () => {
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      const res = await startMpesaPayment({
        purpose: request.purpose,
        amount: request.amount,
        group_id: groupId,
        loan_id: request.loanId,
        phone: phone.trim() || undefined,
        note: request.note
      });
      setPaymentId(res.paymentId);
      setSlow(false);
      setPhase('waiting');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not start the payment');
    } finally {
      setStarting(false);
    }
  };

  const paid = payment?.status === 'success';
  const finish = () => onClose(paid);

  const tryAgain = () => {
    setPayment(null);
    setPaymentId(null);
    setError('');
    setPhase('form');
  };

  const renderForm = () => (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{request.title}</Text>
      <Text style={[styles.amount, { color: colors.text }]}>KES {request.amount.toLocaleString()}</Text>
      {!!request.detail && (
        <Text style={[styles.detail, { color: colors.textSecondary }]}>{request.detail}</Text>
      )}

      <Text style={[styles.label, { color: colors.textMuted }]}>M-Pesa number</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="0712345678"
        placeholderTextColor={colors.placeholder}
      />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        You'll get a prompt on this phone to enter your M-Pesa PIN.
      </Text>

      {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: starting ? 0.7 : 1 }]}
        onPress={handleSend}
        disabled={starting}
      >
        {starting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={[styles.primaryText, { color: colors.primaryText }]}>Send M-Pesa prompt</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={finish} disabled={starting}>
        <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
    </>
  );

  const renderWaiting = () => (
    <>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 14 }} />
      <Text style={[styles.title, { color: colors.text }]}>Check your phone</Text>
      <Text style={[styles.detail, { color: colors.textSecondary }]}>
        Enter your M-Pesa PIN to pay KES {request.amount.toLocaleString()}.
      </Text>
      {slow && (
        <Text style={[styles.hint, { color: colors.textMuted, marginTop: 12 }]}>
          This is taking longer than usual. If you've already entered your PIN, it will be recorded as soon as M-Pesa
          confirms. You can close this and check back later.
        </Text>
      )}
      <TouchableOpacity style={styles.secondaryButton} onPress={() => onClose(false)}>
        <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Close</Text>
      </TouchableOpacity>
    </>
  );

  const renderDone = () => {
    const ok = payment?.status === 'success' && payment.fulfilled;
    const attention = payment?.status === 'success' && !payment.fulfilled;
    const icon = ok ? 'checkmark-circle' : attention ? 'alert-circle' : 'close-circle';
    const tone = ok ? colors.success : attention ? colors.warning : colors.danger;
    const heading = ok
      ? 'Payment received'
      : attention
        ? 'Payment received'
        : payment?.status === 'cancelled'
          ? 'Payment cancelled'
          : 'Payment failed';

    return (
      <>
        <Ionicons name={icon} size={56} color={tone} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={[styles.title, { color: colors.text }]}>{heading}</Text>
        {!!payment?.message && (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>{payment.message}</Text>
        )}
        {!!payment?.receipt && (
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 8 }]}>M-Pesa code: {payment.receipt}</Text>
        )}

        {paid ? (
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={finish}>
            <Text style={[styles.primaryText, { color: colors.primaryText }]}>Done</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={tryAgain}>
              <Text style={[styles.primaryText, { color: colors.primaryText }]}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={finish}>
              <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </>
        )}
      </>
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {phase === 'form' && renderForm()}
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
  label: { fontSize: 13, marginTop: 18, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  hint: { fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  error: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  primaryButton: { padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  primaryText: { fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  secondaryText: { fontWeight: '600' }
});
