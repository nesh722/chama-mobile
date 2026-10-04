import { authAxios } from './authService';

export const requestLoan = async (group_id, amount, due_date) => {
  const api = await authAxios();
  const response = await api.post('/loans/request', { group_id, amount, due_date });
  return response.data;
};

export const decideLoan = async (loanId, decision) => {
  const api = await authAxios();
  const response = await api.patch(`/loans/${loanId}/decide`, { decision });
  return response.data;
};

export const recordRepayment = async (loanId, amount_paid) => {
  const api = await authAxios();
  const response = await api.post(`/loans/${loanId}/repay`, { amount_paid });
  return response.data;
};

export const getGroupLoans = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/loans/group/${groupId}`);
  return response.data;
};

export const getMyLoans = async () => {
  const api = await authAxios();
  const response = await api.get('/loans/my-loans');
  return response.data;
};

export const getPendingApprovals = async () => {
  const api = await authAxios();
  const response = await api.get('/loans/pending-approvals');
  return response.data;
};
