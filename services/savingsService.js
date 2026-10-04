import { authAxios } from './authService';

export const logSavings = async (group_id, amount, note) => {
  const api = await authAxios();
  const response = await api.post('/savings/log', { group_id, amount, note });
  return response.data;
};

export const getGroupSavings = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/savings/group/${groupId}`);
  return response.data;
};

export const getMySavings = async () => {
  const api = await authAxios();
  const response = await api.get('/savings/my-savings');
  return response.data;
};
