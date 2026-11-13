import { authAxios } from './authService';

// ---- Meetings ----
export const getMeetings = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/meetings/group/${groupId}`);
  return response.data; // { canRecord, upcoming, past }
};

export const getMeeting = async (meetingId) => {
  const api = await authAxios();
  const response = await api.get(`/meetings/${meetingId}`);
  return response.data; // { canRecord, meeting, attendance }
};

// meeting_date is an ISO string
export const createMeeting = async ({ group_id, title, meeting_date, venue, agenda }) => {
  const api = await authAxios();
  const response = await api.post('/meetings', { group_id, title, meeting_date, venue, agenda });
  return response.data;
};

export const updateMeeting = async (meetingId, changes) => {
  const api = await authAxios();
  const response = await api.patch(`/meetings/${meetingId}`, changes);
  return response.data;
};

export const cancelMeeting = async (meetingId) => updateMeeting(meetingId, { status: 'cancelled' });

// records = [{ user_id, status: 'present' | 'apology' | 'absent' | 'none' }]
export const saveAttendance = async (meetingId, records) => {
  const api = await authAxios();
  const response = await api.put(`/meetings/${meetingId}/attendance`, { records });
  return response.data;
};

export const saveMinutes = async (meetingId, minutes) => {
  const api = await authAxios();
  const response = await api.put(`/meetings/${meetingId}/minutes`, { minutes });
  return response.data;
};

export const sendApology = async (meetingId, on) => {
  const api = await authAxios();
  const response = await api.post(`/meetings/${meetingId}/apology`, { on });
  return response.data;
};

// ---- Group notices ----
export const getAnnouncements = async (groupId) => {
  const api = await authAxios();
  const response = await api.get(`/announcements/group/${groupId}`);
  return response.data; // { canPost, announcements }
};

export const createAnnouncement = async ({ group_id, title, body }) => {
  const api = await authAxios();
  const response = await api.post('/announcements', { group_id, title, body });
  return response.data;
};

export const deleteAnnouncement = async (id) => {
  const api = await authAxios();
  const response = await api.delete(`/announcements/${id}`);
  return response.data;
};