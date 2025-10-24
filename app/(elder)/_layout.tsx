import { Stack } from 'expo-router';

export default function ElderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F5F5' },
      }}
    >
      <Stack.Screen name="home" />
    </Stack>
  );
}
