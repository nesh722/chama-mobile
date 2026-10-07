import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeProviderCustom, useAppTheme } from '../../context/ThemeContext';

SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { isDark } = useAppTheme();
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="(tabs)" options={{ headerBackTitle: 'My Groups' }} />
        <Stack.Screen name="register" options={{ headerShown: true, title: 'Register', headerBackTitle: '' }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: true, title: 'Forgot Password', headerBackTitle: '' }} />
        <Stack.Screen name="reset-password" options={{ headerShown: true, title: 'Reset Password', headerBackTitle: '' }} />
        <Stack.Screen name="create-group" options={{ headerShown: true, title: 'Create Group', headerBackTitle: '' }} />
        <Stack.Screen name="join-group" options={{ headerShown: true, title: 'Join Group', headerBackTitle: '' }} />
        <Stack.Screen name="group/[id]" options={{ headerShown: true, title: 'Group Details', headerBackTitle: '' }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit Profile', headerBackTitle: '' }} />
        <Stack.Screen name="change-email" options={{ headerShown: true, title: 'Change Email', headerBackTitle: '' }} />
        <Stack.Screen name="change-password" options={{ headerShown: true, title: 'Change Password', headerBackTitle: '' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProviderCustom>
      <InnerLayout />
    </ThemeProviderCustom>
  );
}