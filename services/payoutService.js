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