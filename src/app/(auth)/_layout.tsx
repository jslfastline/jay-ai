import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { Palette } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';

export default function AuthLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: Palette.deepNavy }} />;
  }

  if (status === 'signedIn') {
    return <Redirect href="/chat" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.deepNavy },
      }}
    />
  );
}
