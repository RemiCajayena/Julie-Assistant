import { Ionicons } from "@expo/vector-icons";
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Slot, Tabs } from "expo-router";
import { useEffect } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MicButton } from '../components/MicButton';
import { NotificationProvider } from '../components/NotificationProvider';
import { AuthProvider } from '../contexts/AuthContext';
import { ModeProvider } from '../contexts/ModeContext';

// Función para solicitar todos los permisos necesarios al iniciar
async function requestAllPermissions() {
  try {
    console.log('📱 Solicitando permisos necesarios...');
    
    let allGranted = true;
    
    // 1. Solicitar permisos de micrófono
    try {
      console.log('🎤 Solicitando permisos de micrófono...');
      const audioPermission = await Audio.requestPermissionsAsync();
      const audioGranted = audioPermission.status === 'granted';
      console.log('🎤 Permisos de micrófono:', audioGranted ? 'CONCEDIDOS ✅' : 'DENEGADOS ❌');
      
      if (!audioGranted) {
        allGranted = false;
        Alert.alert(
          'Permiso de Micrófono',
          'Julie necesita acceso al micrófono para poder escucharte y ayudarte.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error al solicitar permisos de micrófono:', error);
      allGranted = false;
    }

    // 2. Solicitar permisos de ubicación
    try {
      console.log('📍 Solicitando permisos de ubicación...');
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      const locationGranted = locationPermission.status === 'granted';
      console.log('📍 Permisos de ubicación:', locationGranted ? 'CONCEDIDOS ✅' : 'DENEGADOS ❌');
      
      if (!locationGranted) {
        allGranted = false;
        Alert.alert(
          'Permiso de Ubicación',
          'Julie necesita tu ubicación para brindarte información del clima y noticias locales.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error al solicitar permisos de ubicación:', error);
      allGranted = false;
    }

    // 3. Solicitar permisos de notificaciones
    try {
      console.log('🔔 Solicitando permisos de notificaciones...');
      const notificationPermission = await Notifications.requestPermissionsAsync();
      const notificationGranted = notificationPermission.status === 'granted';
      console.log('🔔 Permisos de notificaciones:', notificationGranted ? 'CONCEDIDOS ✅' : 'DENEGADOS ❌');
      
      if (!notificationGranted) {
        allGranted = false;
        Alert.alert(
          'Permiso de Notificaciones',
          'Julie necesita enviar notificaciones para recordarte tus medicamentos.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error al solicitar permisos de notificaciones:', error);
      allGranted = false;
    }

    if (allGranted) {
      console.log('✅ Todos los permisos concedidos');
    } else {
      console.log('⚠️ Algunos permisos no fueron concedidos');
    }
  } catch (error) {
    console.error('❌ Error general en solicitud de permisos:', error);
  }
}

export default function RootLayout() {
  // Solicitar permisos al iniciar la app
  useEffect(() => {
    requestAllPermissions();
  }, []);
  
  return (
    <AuthProvider>
      <ModeProvider>
        <NotificationProvider>
          <Slot />
        </NotificationProvider>
      </ModeProvider>
    </AuthProvider>
  );
}

export function TabsLayout() {
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