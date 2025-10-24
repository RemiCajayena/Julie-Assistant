import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Pantalla de bienvenida
 * Permite seleccionar quién usará el dispositivo
 */
export default function WelcomeScreen() {
  const { setMode, setUserInfo, userName: savedUserName } = useMode();
  const router = useRouter();
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState('');

  const handleElderMode = async () => {
    // Si ya hay un nombre guardado, ir directamente a home
    if (savedUserName) {
      await setMode('elder');
      // @ts-ignore - Expo Router type issue
      router.replace('/(elder)/home');
    } else {
      // Mostrar modal para pedir el nombre
      setShowNameModal(true);
    }
  };

  const handleSaveName = async () => {
    const name = userName.trim();
    
    if (!name) {
      Alert.alert('Error', 'Por favor ingresa tu nombre');
      return;
    }

    // Guardar nombre y continuar
    await setUserInfo('usuario123', name);
    await setMode('elder');
    setShowNameModal(false);
    // @ts-ignore - Expo Router type issue
    router.replace('/(elder)/home');
  };

  const handleTutorMode = async () => {
    await setMode('tutor');
    // @ts-ignore - Expo Router type issue
    router.replace('/(auth)/pin-login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Bienvenido a Julie</Text>
        <Text style={styles.subtitle}>
          Tu asistente personal de salud
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.elderButton]}
          onPress={handleElderMode}
        >
          <Text style={styles.buttonEmoji}>👴</Text>
          <Text style={styles.buttonText}>Soy el Usuario</Text>
          <Text style={styles.buttonSubtext}>Interfaz simplificada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tutorButton]}
          onPress={handleTutorMode}
        >
          <Text style={styles.buttonEmoji}>👨‍💼</Text>
          <Text style={styles.buttonText}>Soy el Tutor</Text>
          <Text style={styles.buttonSubtext}>Configuración y gestión</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Puedes cambiar de modo en cualquier momento
      </Text>

      {/* Modal para ingresar nombre */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Cómo te llamas?</Text>
            <Text style={styles.modalSubtitle}>
              Julie usará tu nombre para saludarte
            </Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Ingresa tu nombre"
              value={userName}
              onChangeText={setUserName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowNameModal(false);
                  setUserName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveName}
              >
                <Text style={styles.saveButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: 20,
  },
  button: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  elderButton: {
    backgroundColor: '#4CAF50',
  },
  tutorButton: {
    backgroundColor: '#2196F3',
  },
  buttonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
