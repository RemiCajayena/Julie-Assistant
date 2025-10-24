import { Stack } from 'expo-router';

/**
 * Layout para las pantallas de autenticación
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="pin-setup" />
      <Stack.Screen name="pin-login" />
    </Stack>
  );
}
