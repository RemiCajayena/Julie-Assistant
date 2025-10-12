import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicButton } from '../components/MicButton';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  
  // Función para manejar la transcripción del micrófono
  const handleMicTranscription = (data) => {
    console.log('Transcripción recibida:', data);
    // Aquí puedes manejar la respuesta del micrófono
  };
  
  return (
    <View style={{ 
      backgroundColor: '#000000ff', 
      paddingBottom: insets.bottom, 
      flex: 1, 
      paddingTop: insets.top 
    }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#457dc7ff',
          tabBarInactiveTintColor: 'gray',
          tabBarBadgeStyle: {
            backgroundColor: '#cc1d1dff'
          },
          animation: 'shift',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000000ff',
            borderTopColor: '#333',
            height: 80,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ 
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color}/>
            )
          }}
        />
        <Tabs.Screen
          name="microphone"
          options={{
            title: '',
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={{ 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative'
              }}>
                <MicButton onTranscription={handleMicTranscription} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{ 
            title: "Configuracion",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color}/>
            )
          }} 
        />
      </Tabs>
    </View>
  );
}