import { authAxios } from './authService';

export const setupRotation = async (group_id, user_order) => {
  const api = await authAxios();
  const response = await api.post('/payouts/setup', { group_id, user_order });
  return response.data;
};

export const getRotationStatus = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/payouts/group/${groupId}`);
  return response.data;
};

export const markPayout = async (group_id, idempotency_key) => {
  const api = await authAxios();
  const response = await api.post('/payouts/mark-payout', { group_id, idempotency_key }, { timeout: 15000});
  return response.data;
};

export const getRotationHistory = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/payouts/history/${groupId}`);
  return response.data;
};

// A payout needs a second approver, like loans
export const getPayoutApproval = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/payouts/approval/${groupId}`);
  return response.data;
};

export const requestPayoutApproval = async (group_id) => {
  const api = await authAxios();
  const response = await api.post('/payouts/request', { group_id });
  return response.data;
};

export const decidePayoutApproval = async (approvalId, decision) => {
  const api = await authAxios();
  const response = await api.patch(`/payouts/approvals/${approvalId}/decide`, { decision });
  return response.data;
};

export const cancelPayoutApproval = async (approvalId) => {
  const api = await authAxios();
  const response = await api.post(`/payouts/approvals/${approvalId}/cancel`);
  return response.data;
};