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
import { confirmCashClaim, rejectCashClaim } from '../../services/cashClaimService';

export type CashClaim = {
  id: number;
  kind: 'contribution' | 'loan_repayment';
  payerName: string;
  claimedAmount: number;
};

type Props = {
  claim: CashClaim | null;
  // changed = true when the claim was confirmed or rejected (so the caller can refresh)
  onClose: (changed: boolean) => void;
};

const money = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function CashReviewModal({ claim, onClose }: Props) {
  const { colors } = useAppTheme();

  const [phase, setPhase] = useState<'review' | 'rejecting'>('review');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!claim) return;
    setPhase('review');
    setAmountText(String(claim.claimedAmount));
    setReason('');
    setBusy(false);
    setError('');
  }, [claim]);

  if (!claim) return null;

  const handleConfirm = async () => {
    if (busy) return;
    const value = parseFloat(amountText);
    if (!value || value <= 0) {
      setError('Enter the amount you actually received');
      return;
    }
    if (value > claim.claimedAmount + 1e-9) {
      setError(`They only claimed KES ${money(claim.claimedAmount)}. You can confirm that or less.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Only send an amount when it differs from the claim; the server also never accepts more than claimed
      await confirmCashClaim(claim.id, value === claim.claimedAmount ? undefined : value);
      onClose(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not confirm this');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await rejectCashClaim(claim.id, reason.trim() || undefined);
      onClose(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not reject this');
    } finally {
      setBusy(false);
    }
  };

  const close = () => onClose(false);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
             <View style={[styles.iconBadge, { backgroundColor: colors.primary + '1f' }]}>
                <Ionicons name="cash-outline" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Confirm cash received</Text>
              <Text style={[styles.claimed, { color: colors.text }]}>KES {money(claim.claimedAmount)}</Text>
              <View style={[styles.payer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.payerText, { color: colors.text }]} numberOfLines={1}>from {claim.payerName}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.primary + '1f' }]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>
                  {claim.kind === 'loan_repayment' ? 'Loan repayment' : 'Contribution'}
                </Text>
              </View>

              {phase === 'review' ? (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Amount you received (KES)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    value={amountText}
                    onChangeText={setAmountText}
                    keyboardType="numeric"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Only confirm what is in your hand. If it is less than they said, change the amount.
                  </Text>

                  {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.success, opacity: busy ? 0.7 : 1 }]}
                    onPress={handleConfirm}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.primaryText} />
                    ) : (
                      <Text style={[styles.primaryText, { color: colors.primaryText }]}>Yes, I received it</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => { setError(''); setPhase('rejecting'); }} disabled={busy}>
                    <Text style={[styles.secondaryText, { color: colors.danger }]}>I did not receive this</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={close} disabled={busy}>
                    <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Decide later</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Reason (optional)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="For example: nothing was handed to me"
                    placeholderTextColor={colors.placeholder}
                    maxLength={255}
                  />
                  <Text style={[styles.hint, { color: colors.textMuted }]}>Nothing will be recorded and they will be told.</Text>

                  {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.danger, opacity: busy ? 0.7 : 1 }]}
                    onPress={handleReject}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.primaryText} />
                    ) : (
                      <Text style={[styles.primaryText, { color: colors.primaryText }]}>Reject payment</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => { setError(''); setPhase('review'); }} disabled={busy}>
                    <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Back</Text>
                  </TouchableOpacity>
                </>
              )}
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
  detail: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  claimed: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  payer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, maxWidth: '100%' },
  payerText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  label: { fontSize: 13, marginTop: 18, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  hint: { fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 17 },
  iconBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  pill: { alignSelf: 'center', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, marginTop: 10, maxWidth: '100%' },
  pillText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  error: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  primaryButton: { padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  primaryText: { fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  secondaryText: { fontWeight: '600' }
});
