import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { SideMenuProvider } from '@/components/navigation/SideMenu';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/store/AuthContext';

export default function AppLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: Palette.deepNavy }} />;
  }

  if (status === 'signedOut') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SideMenuProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: Palette.deepNavy },
        }}
      />
    </SideMenuProvider>
  );
}
