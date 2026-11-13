import { authAxios } from './authService';

// A member says "I paid cash to <treasurer/chair>"; nothing is recorded until that person confirms.
export const createCashClaim = async ({ group_id, kind, loan_id, amount, receiver_id }) => {
  const api = await authAxios();
  const response = await api.post('/cash-claims', { group_id, kind, loan_id, amount, receiver_id });
  return response.data;
};

// Cash payments, in any of my groups, that members say they handed to me and that I still have to confirm
export const getPendingCashClaims = async () => {
  const api = await authAxios();
  const response = await api.get('/cash-claims/pending');
  return response.data;
};

export const getCashClaims = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/cash-claims/group/${groupId}`);
  return response.data;
};

// amount = what the receiver actually got (optional, defaults to what the member claimed, never more)
export const confirmCashClaim = async (claimId, amount) => {
  const api = await authAxios();
  const response = await api.post(`/cash-claims/${claimId}/confirm`, amount === undefined ? {} : { amount }, { timeout: 15000 });
  return response.data;
};

export const rejectCashClaim = async (claimId, reason) => {
  const api = await authAxios();
  const response = await api.post(`/cash-claims/${claimId}/reject`, { reason });
  return response.data;
};

// Hide a confirmed / rejected answer from my screen (it stays on record)
export const dismissCashClaim = async (claimId) => {
  const api = await authAxios();
  const response = await api.post(`/cash-claims/${claimId}/dismiss`);
  return response.data;
};

export const cancelCashClaim = async (claimId) => {
  const api = await authAxios();
  const response = await api.post(`/cash-claims/${claimId}/cancel`);
  return response.data;
};