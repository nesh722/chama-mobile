import { authAxios } from './authService';

export const logContribution = async (group_id, amount, user_id) => {
  const api = await authAxios();
  const response = await api.post('/contributions/log', { group_id, amount, user_id });
  return response.data;
};

export const getGroupContributions = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/contributions/group/${groupId}`);
  return response.data;
};

export const getMyContributions = async () => {
  const api = await authAxios();
  const response = await api.get('/contributions/my-contributions');
  return response.data;
};

export const getDefaulters = async (groupId, cyclePeriod) => {
  const api = await authAxios();
  const response = await api.get(`/contributions/group/${groupId}/defaulters`, {
    params: { cycle_period: cyclePeriod }
  });
  return response.data;
};

export const getMyDueStatus = async () => {
  const api = await authAxios();
  const response = await api.get('/contributions/my-due-status');
  return response.data;
};