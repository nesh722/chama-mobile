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
import { createCashClaim } from '../../services/cashClaimService';

export type CashRequest = {
  kind: 'contribution' | 'loan_repayment';
  amount: number; // pre-filled, the member can change it
  title: string;
  detail?: string; // extra line under the title
  loanId?: number;
  maxAmount?: number; // loan repayments can't be more than what is owed
};

export type Approver = { id: number; name: string; role: string };

type Props = {
  request: CashRequest | null;
  approvers: Approver[]; // treasurers / chairs other than the person paying
  groupId: string;
  // sent = true when the claim was created (receiverName is who has to confirm it)
  onClose: (sent: boolean, receiverName?: string) => void;
};

export default function CashClaimModal({ request, approvers, groupId, onClose }: Props) {
  const { colors } = useAppTheme();

  const [amountText, setAmountText] = useState('');
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Start fresh every time the modal opens; with only one possible receiver there is nothing to choose
  useEffect(() => {
    if (!request) return;
    setAmountText(String(request.amount));
    setReceiverId(approvers.length === 1 ? approvers[0].id : null);
    setError('');
    setSending(false);
  }, [request]);

  if (!request) return null;

  const handleSend = async () => {
    if (sending) return;
    const value = parseFloat(amountText);
    if (!value || value <= 0) {
      setError('Enter the amount you handed over');
      return;
    }
    if (request.maxAmount !== undefined && value > request.maxAmount + 1e-9) {
      setError(`The most you can pay is KES ${request.maxAmount.toLocaleString()}`);
      return;
    }
    if (receiverId === null) {
      setError('Choose who you handed the cash to');
      return;
    }

    setSending(true);
    setError('');
    try {
      await createCashClaim({
        group_id: groupId,
        kind: request.kind,
        loan_id: request.loanId,
        amount: value,
        receiver_id: receiverId
      });
      const receiver = approvers.find((a) => a.id === receiverId);
      onClose(true, receiver?.name);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Could not send this');
    } finally {
      setSending(false);
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
              <Text style={[styles.title, { color: colors.text }]}>{request.title}</Text>
              {!!request.detail && (
                <View style={[styles.pill, { backgroundColor: colors.primary + '1f' }]}>
                  <Text style={[styles.pillText, { color: colors.primary }]}>{request.detail}</Text>
                </View>
              )}

              {approvers.length === 0 ? (
                <>
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>
                    No other treasurer or chair can confirm your cash. Pay with M-Pesa, or ask your group to add one.
                  </Text>
                  <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={close}>
                    <Text style={[styles.primaryText, { color: colors.primaryText }]}>OK</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Amount you handed over (KES)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                    value={amountText}
                    onChangeText={setAmountText}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />

                  <Text style={[styles.label, { color: colors.textMuted }]}>Who did you hand the cash to?</Text>
                  <View style={styles.chips}>
                    {approvers.map((a) => {
                      const selected = a.id === receiverId;
                      return (
                        <TouchableOpacity
                          key={a.id}
                          onPress={() => setReceiverId(a.id)}
                          style={[
                            styles.chip,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary + '22' : colors.background
                            }
                          ]}
                        >
                          <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: selected ? '700' : '500' }}>
                            {a.name}
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{a.role}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Nothing is recorded yet. They will be asked to confirm they received it, and it counts once they do.
                  </Text>

                  {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: sending ? 0.7 : 1 }]}
                    onPress={handleSend}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator color={colors.primaryText} />
                    ) : (
                      <Text style={[styles.primaryText, { color: colors.primaryText }]}>Send for confirmation</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={close} disabled={sending}>
                    <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Cancel</Text>
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
  label: { fontSize: 13, marginTop: 18, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  hint: { fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 17 },
  iconBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  pill: { alignSelf: 'center', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, marginTop: 10, maxWidth: '100%' },
  pillText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  error: { fontSize: 13, marginTop: 10, textAlign: 'center' },
  primaryButton: { padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  primaryText: { fontWeight: '600' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  secondaryText: { fontWeight: '600' }
});
