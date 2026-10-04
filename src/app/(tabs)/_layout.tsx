import AppTabs from '@/components/app-tabs';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getToken } from '../../../services/tokenService';

export default function TabLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
      } else {
        setChecking(false);
      }
    };
    checkAuth();
  }, []);

  if (checking) {
    return null;
  }

  return <AppTabs />;
}