import { authAxios } from './authService';

export const getMyActivity = async () => {
  const api = await authAxios();
  const response = await api.get('/activity/my-activity');
  return response.data;
};