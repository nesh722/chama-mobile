import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authAxios } from './authService';

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    const api = await authAxios();
    await api.post('/auth/push-token', { push_token: tokenData.data });
  } catch (err) {
    console.log('Push registration failed:', err.message);
  }
}

export async function unregisterPushToken() {
  try {
    const api = await authAxios();
    await api.delete('/auth/push-token', { timeout: 4000 });
  } catch (err) {
    console.log('Push unregister failed:', err.message);
  }
}