import { authAxios } from './authService';

// Starts an M-Pesa STK push. Resolves with { success, message, paymentId }.
// purpose: 'contribution' | 'savings' | 'loan_repayment'
export const startMpesaPayment = async ({ purpose, amount, group_id, loan_id, phone, note }) => {
  const api = await authAxios();
  const response = await api.post(
    '/mpesa/pay',
    { purpose, amount, group_id, loan_id, phone, note },
    { timeout: 20000 }
  );
  return response.data;
};

// Checks how a payment is doing. Resolves with { success, payment }.
export const getMpesaStatus = async (paymentId) => {
  const api = await authAxios();
  const response = await api.get(`/mpesa/status/${paymentId}`, { timeout: 15000 });
  return response.data;
};