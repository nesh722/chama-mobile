import { authAxios } from './authService';

export const getMyNotifications = async () => {
  const api = await authAxios();
  const response = await api.get('/notifications/my-notifications');
  return response.data;
};

export const markAsRead = async (id) => {
  const api = await authAxios();
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const clearAllNotifications = async () => {
  const api = await authAxios();
  const response = await api.delete('/notifications/clear');
  return response.data;
};