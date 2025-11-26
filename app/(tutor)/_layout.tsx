import { Stack } from 'expo-router';

/**
 * Layout para el modo tutor
 * Con navegación completa
 */
export default function TutorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F5F5' },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="medication-requests" />
      <Stack.Screen name="edit-request" />
      <Stack.Screen name="reminders" />
      <Stack.Screen name="tutor-setup" />
    </Stack>
  );
}
