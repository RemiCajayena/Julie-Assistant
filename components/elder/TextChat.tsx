import { API_URL, getAlternativeUrls } from '@/config/api';
import { ConversationalEngine } from '@/utils/conversationalEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TextChatProps {
  userName?: string;
  userId: string;
  onMedicationAction?: (action: any) => Promise<string | void>;
}


export const TextChat: React.FC<TextChatProps> = ({
  userName,
  userId,
  onMedicationAction,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const conversationalEngine = useRef(new ConversationalEngine()).current;
  const conversationHistory = useRef<any[]>([]).current;
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const isLoadingHistory = useRef(false);

  // Cargar historial de conversación al iniciar
  useEffect(() => {
    loadConversationHistory();
  }, [userId]);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /**
   * Cargar historial de conversación desde AsyncStorage
   */
  const loadConversationHistory = async () => {
    if (isLoadingHistory.current) return;
    isLoadingHistory.current = true;

    try {
      const key = `CONVERSATION_HISTORY_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const history: Message[] = JSON.parse(stored);
        console.log(`📥 Historial cargado: ${history.length} mensajes`);
        
        // Convertir timestamps de string a Date
        const messagesWithDates = history.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(messagesWithDates);
        
        // Reconstruir conversationHistory para el motor conversacional
        conversationHistory.length = 0;
        history.forEach(msg => {
          conversationHistory.push({
            role: msg.role,
            content: msg.content
          });
        });
      } else {
        // Primera vez - mensaje de bienvenida
        const welcomeMessage = `¡Hola${userName ? ' ' + userName : ''}! Soy Julie, tu asistente personal. ¿En qué puedo ayudarte hoy?`;
        addMessage('assistant', welcomeMessage);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      // Si falla, mostrar mensaje de bienvenida
      const welcomeMessage = `¡Hola${userName ? ' ' + userName : ''}! Soy Julie, tu asistente personal. ¿En qué puedo ayudarte hoy?`;
      addMessage('assistant', welcomeMessage);
    } finally {
      isLoadingHistory.current = false;
    }
  };

  /**
   * Guardar historial en AsyncStorage
   */
  const saveConversationHistory = async (newMessages: Message[]) => {
    try {
      const key = `CONVERSATION_HISTORY_${userId}`;
      // Limitar a los últimos 50 mensajes para no saturar storage
      const limitedMessages = newMessages.slice(-50);
      await AsyncStorage.setItem(key, JSON.stringify(limitedMessages));
      console.log(`💾 Historial guardado: ${limitedMessages.length} mensajes`);
    } catch (error) {
      console.error('Error guardando historial:', error);
    }
  };

  const addMessage = async (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    
    // Usar la forma funcional de setState para asegurar que usamos el estado más reciente
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, newMessage];
      console.log(`💬 [TextChat] Total mensajes: ${updatedMessages.length}`, {
        user: updatedMessages.filter(m => m.role === 'user').length,
        assistant: updatedMessages.filter(m => m.role === 'assistant').length
      });
      
      // Guardar en AsyncStorage (sin bloquear el render)
      saveConversationHistory(updatedMessages);
      
      return updatedMessages;
    });
  };

  /**
   * Text-to-Speech usando Google Cloud TTS (OPCIONAL)
   */
  const speakMessageWithTTS = async (text: string) => {
    // TTS es opcional - si falla, no afecta la funcionalidad del chat
    if (isSpeaking) {
      console.log('⏸️ Ya hay un audio reproduciéndose, esperando...');
      return;
    }

    try {
      setIsSpeaking(true);

      // Detener audio anterior si existe
      if (currentSoundRef.current) {
        console.log('⏹️ Deteniendo audio anterior...');
        try {
          await currentSoundRef.current.stopAsync();
          await currentSoundRef.current.unloadAsync();
        } catch (e) {
          console.log('Audio ya estaba detenido');
        }
        currentSoundRef.current = null;
      }

      console.log('🎵 Generando audio con Google Cloud TTS...');
      
      // Intentar con la URL principal primero
      let response;
      const urls = [API_URL, ...getAlternativeUrls()];
      let ttsSuccess = false;
      
      for (const url of urls) {
        try {
          console.log(`🔄 Intentando TTS con: ${url}`);
          response = await axios.post(
            `${url}/tts`,
            { text },
            { 
              timeout: 8000,
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          if (response?.data?.audioContent) {
            console.log('✅ TTS exitoso');
            ttsSuccess = true;
            break;
          }
        } catch (err) {
          console.log(`❌ Fallo TTS con ${url}, intentando siguiente...`);
        }
      }

      if (!ttsSuccess || !response?.data?.audioContent) {
        console.log('⚠️ No se pudo obtener audio, continuando sin TTS');
        setIsSpeaking(false);
        return; // Continuar sin audio, no es crítico
      }

      // Configurar modo de audio para reproducción
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Crear y reproducir el audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${response.data.audioContent}` },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('✅ Audio terminado de reproducir');
            setIsSpeaking(false);
            currentSoundRef.current = null;
          }
        }
      );

      currentSoundRef.current = sound;
      console.log('🔊 Reproduciendo audio...');
      
    } catch (error) {
      console.error('❌ Error en TTS (no crítico, continuando):', error);
      setIsSpeaking(false);
      // No lanzar error - el chat funciona sin audio
    }
  };

  /**
   * Enviar mensaje y obtener respuesta
   */
  const handleSendMessage = async () => {
    const text = inputText.trim();
    
    if (!text || isProcessing) {
      return;
    }

    // Limpiar input y agregar mensaje del usuario
    setInputText('');
    addMessage('user', text);
    setIsProcessing(true);

    try {
      console.log('💬 Procesando mensaje:', text);

      // Agregar al historial de conversación
      conversationHistory.push({
        role: 'user',
        content: text,
      });

      // Obtener respuesta del motor conversacional
      const responseText = await conversationalEngine.generateResponse(
        text,
        conversationHistory,
        { userId, userName },
        onMedicationAction
      );
      console.log('🤖 Respuesta de Julie:', responseText);

      // Agregar respuesta al historial
      conversationHistory.push({
        role: 'assistant',
        content: responseText,
      });

      // Mostrar respuesta en el chat
      addMessage('assistant', responseText);

      // Reproducir audio de la respuesta
      await speakMessageWithTTS(responseText);

    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      const errorMessage = 'Lo siento, tuve un problema. ¿Puedes repetir?';
      addMessage('assistant', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Detener audio actual
   */
  const stopCurrentAudio = async () => {
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
        setIsSpeaking(false);
        console.log('⏹️ Audio detenido');
      } catch (error) {
        console.error('Error deteniendo audio:', error);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Chat de Prueba</Text>
        <Text style={styles.headerSubtitle}>Modo desarrollo (sin micrófono)</Text>
      </View>

      {/* Mensajes */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {message.content}
            </Text>
            <Text
              style={[
                styles.timestamp,
                message.role === 'user' ? styles.userTimestamp : styles.assistantTimestamp,
              ]}
            >
              {message.timestamp.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}
        
        {isProcessing && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.assistantText}>Julie está pensando...</Text>
          </View>
        )}
      </ScrollView>

      {/* Indicador de audio */}
      {isSpeaking && (
        <View style={styles.speakingIndicator}>
          <ActivityIndicator color="#4CAF50" size="small" />
          <Text style={styles.speakingText}>🔊 Reproduciendo...</Text>
          <TouchableOpacity onPress={stopCurrentAudio} style={styles.stopButton}>
            <Text style={styles.stopButtonText}>⏹️ Detener</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input de texto */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          multiline
          maxLength={500}
          editable={!isProcessing}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isProcessing) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isProcessing}
        >
          <Text style={styles.sendButtonText}>
            {isProcessing ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botones de prueba rápida */}
      <ScrollView 
        horizontal 
        style={styles.quickButtons}
        showsHorizontalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => setInputText('¿Qué medicamentos debo tomar hoy?')}
        >
          <Text style={styles.quickButtonText}>💊 Medicamentos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => setInputText('Ya tomé mi aspirina')}
        >
          <Text style={styles.quickButtonText}>✅ Registrar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => setInputText('¿A qué hora debo tomar mi próximo medicamento?')}
        >
          <Text style={styles.quickButtonText}>⏰ Próximo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => setInputText('Hola Julie')}
        >
          <Text style={styles.quickButtonText}>👋 Saludar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#45a049',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E8F5E9',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.9,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  speakingText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  sendButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  quickButtons: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 50,
  },
  quickButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
});
