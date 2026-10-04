import { authAxios } from './authService';

export const getMyGroups = async () => {
  const api = await authAxios();
  const response = await api.get('/groups/my-groups');
  return response.data;
};

export const createGroup = async (name, description, contribution_amount, contribution_frequency) => {
  const api = await authAxios();
  const response = await api.post('/groups/create', { name, description, contribution_amount, contribution_frequency });
  return response.data;
};

export const joinGroup = async (group_id) => {
  const api = await authAxios();
  const response = await api.post('/groups/join', { group_id });
  return response.data;
};

export const getGroupDetails = async (id) => {
  const api = await authAxios();
  const response = await api.get(`/groups/${id}`);
  return response.data;
};
export const setSavingsTarget = async (groupId, savings_target) => {
  const api = await authAxios();
  const response = await api.post(`/groups/${groupId}/set-target`, { savings_target });
  return response.data;
};

export const getSavingsProgress = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/groups/${groupId}/savings-progress`);
  return response.data;
};
export const changeRole = async (groupId, member_user_id, new_role) => {
  const api = await authAxios();
  const response = await api.patch(`/groups/${groupId}/change-role`, { member_user_id, new_role });
  return response.data;
};
export const removeMember = async (groupId, member_user_id) => {
  const api = await authAxios();
  const response = await api.post(`/groups/${groupId}/remove-member`, { member_user_id });
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const api = await authAxios();
  const response = await api.delete(`/groups/${groupId}`);
  return response.data;
};

export const getMySavingsProgress = async () => {
  const api = await authAxios();
  const response = await api.get('/groups/my-savings-progress');
  return response.data;
};
export const getInviteToken = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/groups/${groupId}/invite`);
  return response.data;
};

export const regenerateInvite = async (groupId) => {
  const api = await authAxios();
  const response = await api.post(`/groups/${groupId}/regenerate-invite`);
  return response.data;
};

export const joinByToken = async (token) => {
  const api = await authAxios();
  const response = await api.post('/groups/join-by-token', { token });
  return response.data;
};

export const previewGroupByToken = async (token) => {
  const api = await authAxios();
  const response = await api.get(`/groups/preview/${token}`);
  return response.data;
};