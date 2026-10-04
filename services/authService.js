import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getToken } from './tokenService';
import { Platform } from 'react-native';

export const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  return response.data;
};

export const register = async (full_name, email, phone, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, { full_name, email, phone, password });
  return response.data;
};

// Creates an axios instance that automatically attaches the saved JWT token
export const authAxios = async () => {
  const token = await getToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
};
export const getProfile = async () => {
  const api = await authAxios();
  const response = await api.get('/auth/profile');
  return response.data;
};
export const requestPasswordReset = async (email) => {
  const response = await axios.post(`${API_BASE_URL}/auth/request-password-reset`, { email });
  return response.data;
};

export const resetPassword = async (token, new_password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, { token, new_password });
  return response.data;
};

export const uploadAvatar = async (imageUri) => {
  const api = await authAxios();
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, the picker gives us a blob: URL — fetch it to get an actual Blob/File
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const filename = `avatar_${Date.now()}.jpg`;
    formData.append('avatar', blob, filename);
  } else {
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('avatar', { uri: imageUri, name: filename, type });
  }

  const uploadResponse = await api.post('/auth/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return uploadResponse.data;
};
export const updateProfile = async (full_name, phone) => {
  const api = await authAxios();
  const response = await api.put('/auth/update-profile', { full_name, phone });
  return response.data;
};

export const changeEmail = async (current_password, new_email) => {
  const api = await authAxios();
  const response = await api.put('/auth/change-email', { current_password, new_email });
  return response.data;
};

export const changePassword = async (current_password, new_password) => {
  const api = await authAxios();
  const response = await api.put('/auth/change-password', { current_password, new_password });
  return response.data;
};

export const deleteAccount = async () => {
  const api = await authAxios();
  const response = await api.delete('/auth/delete-account');
  return response.data;
};