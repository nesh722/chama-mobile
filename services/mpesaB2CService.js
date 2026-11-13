import { authAxios } from './authService';

// Sends money OUT through M-Pesa (treasurer / chair only).
// purpose: 'payout' (needs group_id) | 'loan_disbursement' (needs loan_id)
// phone is only used while the backend is in sandbox mode.
export const sendMpesaB2C = async ({ purpose, group_id, loan_id, phone }) => {
  const api = await authAxios();
  const response = await api.post(
    '/mpesa/b2c/send',
    { purpose, group_id, loan_id, phone },
    { timeout: 25000 }
  );
  return response.data;
};

// The latest transfer for each payout turn / loan in a group. Resolves with { success, sandbox, transfers }.
export const getB2CTransfers = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/mpesa/b2c/group/${groupId}`, { timeout: 15000 });
  return response.data;
};

// How one transfer is doing. Resolves with { success, transfer }.
export const getB2CStatus = async (transferId) => {
  const api = await authAxios();
  const response = await api.get(`/mpesa/b2c/status/${transferId}`, { timeout: 15000 });
  return response.data;
};

// Frees a transfer M-Pesa never answered for, so it can be sent again.
export const releaseB2C = async (transferId) => {
  const api = await authAxios();
  const response = await api.post(`/mpesa/b2c/release/${transferId}`, {}, { timeout: 15000 });
  return response.data;
};