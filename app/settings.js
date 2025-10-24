import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Settings() {
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const id = await AsyncStorage.getItem('USER_ID');
      if (id) setUserId(id);
    } catch (error) {
      console.error('Error cargando USER_ID:', error);
    }
  };

  const clearConversationHistory = async () => {
    Alert.alert(
      'Limpiar Historial',
      '¿Estás seguro de que quieres eliminar todo el historial de conversación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (userId) {
                const key = `CONVERSATION_HISTORY_${userId}`;
                await AsyncStorage.removeItem(key);
                Alert.alert('Éxito', 'Historial de conversación eliminado');
              }
            } catch (error) {
              console.error('Error limpiando historial:', error);
              Alert.alert('Error', 'No se pudo eliminar el historial');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={clearConversationHistory}
      >
        <Text style={styles.buttonText}>🗑️ Limpiar Historial de Conversación</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});