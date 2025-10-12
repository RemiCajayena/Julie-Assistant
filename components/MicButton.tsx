import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import { Alert, Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ConversationalEngine } from '../utils/conversationalEngine';

interface MicButtonProps {
  onTranscription?: (data: { userText: string; aiResponse: string }) => void;
}

export const MicButton = ({ onTranscription }: MicButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState<string | null>(null); // SIMPLE: solo guardar nombre
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [conversationalEngine] = useState(() => new ConversationalEngine());
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  // Animación de pulso mientras graba
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startRecording = async () => {
    try {
      // Pedir permisos
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Error', 'Necesito permisos de micrófono para funcionar');
        return;
      }

      // Configurar audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Crear grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      startPulseAnimation();
      
      console.log('Grabación iniciada');
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      Alert.alert('Error', 'No pude iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      stopPulseAnimation();
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        console.log('Grabación guardada en:', uri);
        setShowTextInput(true); // Mostrar input en lugar de procesar audio
      }
    } catch (error) {
      console.error('Error al detener grabación:', error);
      Alert.alert('Error', 'No pude procesar la grabación');
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Escribe algo primero');
      return;
    }
    
    setShowTextInput(false);
    await processText(inputText.trim());
    setInputText('');
  };

  const processText = async (text: string) => {
    setIsProcessing(true);
    
    try {
      const aiResponse = await getAdvancedResponse(text);
      
      if (onTranscription) {
        onTranscription({
          userText: text,
          aiResponse: aiResponse
        });
      }
      
      Speech.speak(aiResponse, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9,
      });
      
    } catch (error) {
      console.error('Error procesando texto:', error);
      Alert.alert('Error', 'No pude procesar tu mensaje');
    } finally {
      setIsProcessing(false);
    }
  };

  // FUNCIÓN SUPER SIMPLE para detectar nombre y responder
  const getAdvancedResponse = async (text: string): Promise<string> => {
    console.log('🧠 Procesando con IA avanzada:', text);
    
    try {
      const newHistory = [...conversationHistory, { role: 'user', content: text }];
      setConversationHistory(newHistory);
      
      const response = await conversationalEngine.generateResponse(
        text,
        newHistory,
        { userName: userName || undefined, preferences: [] }
      );
      
      setConversationHistory(prev => [...prev, { role: 'assistant', content: response }]);
      
      return response;
    } catch (error) {
      console.error('Error en IA avanzada:', error);
      return 'Disculpa, estoy teniendo algunos problemas técnicos. ¿Podrías intentar de nuevo?';
    }
  };

  const handlePress = () => {
    if (!isProcessing) {
      setShowTextInput(true); // Ir directo al modal
    }
  };

  const getButtonColor = (): string => {
    if (isProcessing) return '#F59E0B'; // Amarillo procesando
    if (isRecording) return '#EF4444'; // Rojo grabando
    return '#4F46E5'; // Azul normal
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isProcessing) return 'hourglass-outline';
    return 'chatbubble-outline'; // Cambiar a ícono de chat
  };

  return (
    <>
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            onPress={handlePress} 
            style={[styles.button, { backgroundColor: getButtonColor() }]} 
            activeOpacity={0.85}
            disabled={isProcessing}
          >
            <Ionicons name={getIcon()} size={30} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        
        {userName && (
          <Text style={styles.nameText}>Hola, {userName}!</Text>
        )}
      </View>

      <Modal visible={showTextInput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Qué quieres decirle a Julie?</Text>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe tu mensaje aquí..."
              multiline
              autoFocus
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowTextInput(false);
                  setInputText('');
                }}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleSendText}
              >
                <Text style={styles.sendText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  nameText: {
    position: 'absolute',
    bottom: -30,
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  sendButton: {
    padding: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  sendText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
