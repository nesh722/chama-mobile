import { API_BASE_URL } from '../config/api';
import { authAxios } from './authService';
import { getToken } from './tokenService';

export const getReport = async (groupId, type) => {
  const api = await authAxios();
  const response = await api.get(`/reports/${groupId}/${type}`);
  return response.data;
};

// Returns { url, headers } for downloading the export file with the auth
// token attached — Linking.openURL can't carry custom headers, so this is
// meant to be used with expo-file-system's downloadAsync instead.
export const getExportDownloadConfig = async (groupId, type, format) => {
  const token = await getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return {
    url: `${API_BASE_URL}/reports/${groupId}/${type}/export?format=${format}`,
    headers
  };
};