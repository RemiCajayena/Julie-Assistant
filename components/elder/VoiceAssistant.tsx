import { API_URL, getAlternativeUrls } from '@/config/api';
import { ConversationalEngine } from '@/utils/conversationalEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Audio, InterruptionModeAndroid } from 'expo-av';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceAssistantProps {
  userName?: string;
  userId: string;
  onMedicationAction?: (action: any) => Promise<string | void>;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  userName,
  userId,
  onMedicationAction,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showConversation, setShowConversation] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);
  const [bestVoice, setBestVoice] = useState<string | undefined>(undefined);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const conversationalEngine = useRef(new ConversationalEngine()).current;
  const conversationHistory = useRef<any[]>([]).current;
  const currentSoundRef = useRef<Audio.Sound | null>(null); // Referencia al audio actual
  const isLoadingHistory = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null); // Referencia para auto-scroll

  // Cargar historial de conversación al iniciar
  useEffect(() => {
    loadConversationHistory();
  }, [userId]);

  // Auto-scroll cuando se abre el panel o hay nuevos mensajes
  useEffect(() => {
    if (showConversation && scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [showConversation, messages]);

  // Solicitar permisos de audio al montar el componente
  useEffect(() => {
    const requestPermissions = async () => {
      console.log('🔐 Verificando permisos de audio...');
      try {
        // Primero verificar si ya tenemos permisos
        const { status: existingStatus } = await Audio.getPermissionsAsync();
        
        if (existingStatus === 'granted') {
          console.log('✅ Permisos de audio ya concedidos previamente');
          setHasPermissions(true);
          
          // Configurar modo de audio inicial para reproducción
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
          console.log('🔊 Modo de audio inicial configurado');

          // Detectar la mejor voz española disponible
          await detectBestVoice();
        } else {
          // Si no tenemos permisos, solicitarlos
          console.log('📱 Solicitando permisos de audio...');
          const permission = await Audio.requestPermissionsAsync();
          
          if (permission.status === 'granted') {
            console.log('✅ Permisos de audio concedidos');
            setHasPermissions(true);
            
            // Configurar modo de audio inicial para reproducción
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
              staysActiveInBackground: false,
            });
            console.log('🔊 Modo de audio inicial configurado');

            // Detectar la mejor voz española disponible
            await detectBestVoice();
          } else {
            console.log('❌ Permisos de audio denegados');
            setHasPermissions(false);
          }
        }
      } catch (error) {
        console.error('Error solicitando permisos:', error);
        setHasPermissions(false);
      }
    };

    requestPermissions();
  }, []);

  /**
   * Detectar la mejor voz española disponible
   */
  const detectBestVoice = async () => {
    try {
      console.log('🎙️ Detectando voces disponibles...');
      const voices = await Speech.getAvailableVoicesAsync();
      
      // Buscar voces españolas en orden de preferencia
      const spanishVoices = voices.filter((v: any) => 
        v.language.startsWith('es-ES') || 
        v.language.startsWith('es-MX') || 
        v.language.startsWith('es')
      );

      console.log(`🇪🇸 Voces en español encontradas: ${spanishVoices.length}`);
      
      if (spanishVoices.length > 0) {
        // Preferir voces que contengan palabras clave de calidad
        const premiumVoice = spanishVoices.find((v: any) => 
          v.identifier?.toLowerCase().includes('premium') ||
          v.identifier?.toLowerCase().includes('enhanced') ||
          v.identifier?.toLowerCase().includes('natural') ||
          v.name?.toLowerCase().includes('premium') ||
          v.name?.toLowerCase().includes('enhanced')
        );

        if (premiumVoice) {
          setBestVoice(premiumVoice.identifier);
          console.log('✨ Voz premium detectada:', premiumVoice.name || premiumVoice.identifier);
        } else {
          // Usar la primera voz española disponible
          setBestVoice(spanishVoices[0].identifier);
          console.log('🎤 Usando voz:', spanishVoices[0].name || spanishVoices[0].identifier);
        }
        
        spanishVoices.forEach((v: any, i: number) => {
          console.log(`  ${i + 1}. ${v.name} (${v.language}) - ${v.identifier}`);
        });
      } else {
        console.log('⚠️ No se encontraron voces en español, usando voz por defecto');
      }
    } catch (error) {
      console.warn('⚠️ Error detectando voces:', error);
    }
  };

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
        console.log('📝 No hay historial previo, iniciando conversación nueva');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
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



  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startRecording = async () => {
    try {
      console.log('🎙️ Iniciando grabación...');
      
      // Verificar permisos cacheados
      if (!hasPermissions) {
        console.log('❌ No hay permisos de audio');
        await addMessage('assistant', 'Necesito permisos de micrófono para escucharte');
        await speakMessage('Necesito permisos de micrófono para escucharte');
        return;
      }
      console.log('✅ Permisos verificados (cacheados)');
      
      // Si hay una grabación anterior, limpiarla
      if (recording) {
        console.log('🧹 Limpiando grabación anterior...');
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('⚠️ No se pudo limpiar grabación anterior (ya estaba limpia)');
        }
        setRecording(null);
      }

      console.log('⚙️ Configurando modo de audio...');
      // Configurar modo de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('🎙️ Creando objeto de grabación...');
      // Crear grabación con formato compatible con Whisper
      const { recording: newRecording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      console.log('✅ Objeto de grabación creado');
      setRecording(newRecording);
      setIsRecording(true);
      startPulseAnimation();

      console.log('🎤 Grabación iniciada exitosamente - isRecording ahora es true');
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      await addMessage('assistant', 'Lo siento, no pude iniciar la grabación');
      await speakMessage('Lo siento, no pude iniciar la grabación');
    }
  };

  /**
   * Detener grabación y procesar
   */
  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      stopPulseAnimation();

      console.log('⏹️ Deteniendo y guardando grabación...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Resetear modo de audio para liberar el micrófono y permitir reproducción
      console.log('🔊 Configurando modo de audio para reproducción...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      if (uri) {
        console.log('🎤 Grabación guardada:', uri);
        await transcribeAndProcess(uri);
      }
    } catch (error) {
      console.error('Error al detener grabación:', error);
      setRecording(null); // Asegurar que se limpie
      setIsRecording(false);
      setIsProcessing(false);
      await addMessage('assistant', 'Hubo un problema al procesar tu mensaje');
      await speakMessage('Hubo un problema al procesar tu mensaje');
    }
  };

  /**
   * Transcribir audio y procesar con IA
   */
  const transcribeAndProcess = async (audioUri: string) => {
    setIsProcessing(true);
    setShowConversation(true);

    try {
      // 1. Transcribir audio con Whisper
      const transcription = await transcribeAudio(audioUri);
      
      if (!transcription) {
        await addMessage('assistant', 'No pude entender lo que dijiste. ¿Puedes repetir?');
        await speakMessage('No pude entender lo que dijiste. ¿Puedes repetir?');
        return;
      }

      console.log('📝 Transcripción:', transcription);
      await addMessage('user', transcription);

      // 2. Generar respuesta con IA
      conversationHistory.push({ role: 'user', content: transcription });

      const response = await conversationalEngine.generateResponse(
        transcription,
        conversationHistory,
        { 
          userName: userName || 'Usuario',
          preferences: [],
          userId 
        },
        onMedicationAction
      );

      console.log('🤖 Respuesta de Julie:', response);
      conversationHistory.push({ role: 'assistant', content: response });
      
      await addMessage('assistant', response);

      // 3. Hablar respuesta
      await speakMessage(response);

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      const errorMsg = 'Disculpa, tuve un problema técnico. ¿Puedes intentar de nuevo?';
      await addMessage('assistant', errorMsg);
      await speakMessage(errorMsg);
    } finally {
      // Resetear completamente el modo de audio para permitir nueva grabación
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        console.log('🔄 Modo de audio reseteado');
      } catch (err) {
        console.error('Error reseteando audio:', err);
      }
      
      // Asegurar que siempre se libere el estado de procesamiento
      setIsProcessing(false);
      console.log('✅ Procesamiento completado, listo para nueva grabación');
    }
  };

  /**
   * Transcribir audio usando servidor con axios
   */
  const transcribeAudio = async (uri: string): Promise<string | null> => {
    try {
      console.log('📡 Intentando transcribir desde:', API_URL);
      console.log('📁 URI del audio:', uri);

      // Crear FormData compatible con React Native
      const formData = new FormData();
      
      // Extraer nombre del archivo de la URI
      const fileName = uri.split('/').pop() || 'recording.m4a';
      
      formData.append('audio', {
        uri,
        type: 'audio/mp4', // Tipo MIME correcto para M4A
        name: fileName,
      } as any);

      console.log('📤 Enviando archivo:', fileName);
      console.log('📤 Enviando solicitud a:', `${API_URL}/transcribe`);

      // Usar axios con reintentos automáticos
      let response;
      let lastError;
      
      // Intentar con la URL principal
      try {
        response = await axios.post(`${API_URL}/transcribe`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 20000,
        });
      } catch (error) {
        console.log(`⚠️ Falló URL principal para transcripción, intentando alternativas...`);
        lastError = error;
        
        // Intentar con URLs alternativas
        const alternativeUrls = getAlternativeUrls();
        for (const url of alternativeUrls) {
          try {
            console.log(`🔄 Intentando transcribir con: ${url}`);
            response = await axios.post(`${url}/transcribe`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 20000,
            });
            console.log(`✅ Transcripción exitosa con: ${url}`);
            break;
          } catch (altError) {
            lastError = altError;
            continue;
          }
        }
      }
      
      if (!response) {
        throw lastError || new Error('No se pudo conectar al servidor para transcribir');
      }

      console.log('✅ Transcripción exitosa:', response.data.text);
      return response.data.text || null;
    } catch (error: any) {
      console.error('❌ Error transcribiendo:', error);
      
      if (error.response) {
        // El servidor respondió con un error
        console.error('Error del servidor:', error.response.status, error.response.data);
      } else if (error.request) {
        // La solicitud se hizo pero no hubo respuesta
        console.error('Sin respuesta del servidor. Verifica que el servidor esté corriendo.');
      } else {
        // Algo pasó al configurar la solicitud
        console.error('Error configurando solicitud:', error.message);
      }
      
      return null;
    }
  };

  /**
   * Agregar mensaje a la conversación
   */
  const addMessage = async (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    
    console.log(`💬 Agregando mensaje [${role}]: "${content.substring(0, 50)}..."`);
    
    // Usar la forma funcional de setState para asegurar que usamos el estado más reciente
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, newMessage];
      console.log(`📊 Total de mensajes ahora: ${updatedMessages.length}`, {
        user: updatedMessages.filter(m => m.role === 'user').length,
        assistant: updatedMessages.filter(m => m.role === 'assistant').length
      });
      
      // Guardar en AsyncStorage (sin bloquear el render)
      saveConversationHistory(updatedMessages);
      
      return updatedMessages;
    });
  };

  /**
   * Reproducir mensaje con text-to-speech usando OpenAI API
   * Voces naturales de alta calidad
   */
  const speakMessageWithOpenAI = async (text: string) => {
    try {
      const startTime = Date.now();
      console.log('🎙️ === INICIANDO TTS CON GOOGLE CLOUD ===');
      console.log('📢 Texto:', text.substring(0, 50) + '...');

      // Detener audio anterior si existe (evita interferencias)
      if (currentSoundRef.current) {
        console.log('🛑 Deteniendo audio anterior...');
        try {
          await currentSoundRef.current.stopAsync();
          await currentSoundRef.current.unloadAsync();
        } catch (err) {
          console.log('⚠️ Error deteniendo audio anterior:', err);
        }
        currentSoundRef.current = null;
      }

      setIsSpeaking(true);

      // Llamar a la API del servidor con reintentos
      let response;
      let lastError;
      
      // Intentar con la URL principal primero
      try {
        console.log(`🌐 Intentando conectar a: ${API_URL}`);
        response = await axios.post(`${API_URL}/tts`, {
          text,
          voice: 'es-US-Neural2-A',
        }, {
          responseType: 'arraybuffer',
          timeout: 8000,
        });
      } catch (error) {
        console.log(`⚠️ Falló URL principal, intentando alternativas...`);
        lastError = error;
        
        // Intentar con URLs alternativas
        const alternativeUrls = getAlternativeUrls();
        for (const url of alternativeUrls) {
          try {
            console.log(`🔄 Intentando: ${url}`);
            response = await axios.post(`${url}/tts`, {
              text,
              voice: 'es-US-Neural2-A',
            }, {
              responseType: 'arraybuffer',
              timeout: 8000,
            });
            console.log(`✅ Conectado exitosamente a: ${url}`);
            break; // Si funciona, salir del loop
          } catch (altError) {
            console.log(`❌ Falló: ${url}`);
            lastError = altError;
            continue;
          }
        }
      }
      
      // Si ninguna URL funcionó, lanzar error
      if (!response) {
        throw lastError || new Error('No se pudo conectar al servidor');
      }

      const fetchTime = Date.now() - startTime;
      console.log('✅ Audio recibido del servidor (formato MP3)');
      console.log(`📦 Tamaño: ${(response.data.byteLength / 1024).toFixed(2)} KB`);
      console.log(`⏱️ Tiempo de generación: ${fetchTime}ms`);

      // Configurar audio SIMPLIFICADO (sin interferencias)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      // Método optimizado: convertir a base64 más rápido
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(response.data)));

      // Reproducir el audio con configuración SIMPLE
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${base64Audio}` },
        { 
          shouldPlay: true, 
          volume: 1.0,
          rate: 1.0,
        },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('✅ Audio completado');
            setIsSpeaking(false);
            currentSoundRef.current = null;
            sound.unloadAsync();
          }
        }
      );

      // Guardar referencia al sonido actual
      currentSoundRef.current = sound;

      console.log('▶️ Reproduciendo audio (Google Cloud - voz nativa español)...');

    } catch (error) {
      console.error('❌ Error en TTS con OpenAI:', error);
      setIsSpeaking(false);
      
      // Fallback a expo-speech si falla OpenAI
      console.log('⚠️ Usando fallback a expo-speech...');
      await speakMessageWithExpoSpeech(text);
    }
  };

  /**
   * Reproducir mensaje con expo-speech (método original, como fallback)
   */
  const speakMessageWithExpoSpeech = async (text: string) => {
    try {
      console.log('🔊 Iniciando TTS con expo-speech...');
      
      // Configurar modo de audio para reproducción
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      } catch (audioError) {
        console.warn('⚠️ No se pudo configurar modo de audio:', audioError);
      }
      
      await Speech.stop();
      setIsSpeaking(true);

      return new Promise<void>((resolve) => {
        const speechOptions: any = {
          language: 'es-MX', // Español México (más natural que es-ES)
          pitch: 1.05,       // Pitch ligeramente más alto (más natural)
          rate: 0.95,        // Velocidad un poco más lenta (más clara)
          volume: 1.0,
          quality: 'enhanced', // Calidad mejorada si está disponible
          onDone: () => {
            console.log('✅ TTS completado');
            setIsSpeaking(false);
            resolve();
          },
          onError: (error: any) => {
            console.error('❌ Error en TTS:', error);
            setIsSpeaking(false);
            resolve();
          },
          onStopped: () => {
            console.log('⏹️ TTS detenido');
            setIsSpeaking(false);
            resolve();
          },
        };

        // Priorizar voces femeninas de alta calidad
        if (bestVoice) {
          speechOptions.voice = bestVoice;
        }

        Speech.speak(text, speechOptions);
      });
    } catch (error) {
      console.error('💥 Error en expo-speech:', error);
      setIsSpeaking(false);
    }
  };

  /**
   * Reproducir mensaje con text-to-speech
   * Usa OpenAI TTS por defecto, con fallback a expo-speech
   */
  const speakMessage = async (text: string) => {
    // Usar OpenAI TTS para mejor calidad
    await speakMessageWithOpenAI(text);
  };

  /**
   * Detener el TTS
   */
  const stopSpeaking = async () => {
    console.log('🤐 Deteniendo TTS...');
    await Speech.stop();
    setIsSpeaking(false);
  };

  /**
   * Toggle grabación con un solo tap
   */
  const handlePress = () => {
    console.log('👆 Botón presionado - isProcessing:', isProcessing, 'isRecording:', isRecording);
    
    if (isProcessing) {
      console.log('⏸️ Bloqueado: está procesando');
      return;
    }

    if (isRecording) {
      // Si está grabando, detener
      console.log('⏹️ Deteniendo grabación...');
      stopRecording();
    } else {
      // Si no está grabando, iniciar
      console.log('▶️ Iniciando grabación...');
      startRecording();
    }
  };

  /**
   * Obtener color del botón según estado
   */
  const getButtonColor = () => {
    if (isProcessing) return '#F59E0B'; // Amarillo
    if (isRecording) return '#EF4444'; // Rojo
    return '#4CAF50'; // Verde
  };

  /**
   * Obtener texto del botón
   */
  const getButtonText = () => {
    if (isProcessing) return 'Procesando...';
    if (isRecording) return 'Toca para detener';
    return 'Toca para hablar';
  };

  /**
   * Probar TTS directamente
   */
  const handleTestTTS = async () => {
    setTestingAudio(true);
    console.log('🧪 === TEST TTS CON GOOGLE CLOUD INICIADO ===');
    
    try {
      await speakMessageWithOpenAI('Hola, soy Julie. Esto es una prueba de voz');
    } catch (error) {
      console.error('💥 Error en test de TTS:', error);
    } finally {
      setTimeout(() => setTestingAudio(false), 1000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botón principal de voz */}
      <View style={styles.mainContent}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.voiceButton, { backgroundColor: getButtonColor() }]}
            onPress={handlePress}
            disabled={isProcessing}
            activeOpacity={0.9}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.voiceEmoji}>
                  {isRecording ? '🎙️' : '🎤'}
                </Text>
                <Text style={styles.voiceText}>{getButtonText()}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Botón para detener cuando Julie está hablando */}
        {isSpeaking && (
          <TouchableOpacity
            style={styles.stopSpeakingButton}
            onPress={stopSpeaking}
            activeOpacity={0.9}
          >
            <Text style={styles.stopSpeakingEmoji}>🤐</Text>
            <Text style={styles.stopSpeakingText}>Detener a Julie</Text>
          </TouchableOpacity>
        )}

        {messages.length > 0 && !showConversation && (
          <TouchableOpacity
            style={styles.showConversationButton}
            onPress={() => setShowConversation(true)}
          >
            <Text style={styles.showConversationText}>
              Ver conversación ({messages.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Botón de test de audio */}
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestTTS}
          disabled={testingAudio}
        >
          <Text style={styles.testButtonText}>
            {testingAudio ? '🔊 Probando...' : '🧪 Test de Audio'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Panel de conversación flotante */}
      {showConversation && messages.length > 0 && (
        <View style={styles.conversationPanel}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle}>💬 Conversación ({messages.length})</Text>
            <TouchableOpacity onPress={() => setShowConversation(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={true}
          >
            {messages.map((msg, index) => {
              console.log(`📨 Renderizando mensaje ${index + 1}/${messages.length}:`, {
                id: msg.id,
                role: msg.role,
                preview: msg.content.substring(0, 30)
              });
              return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user'
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === 'user'
                      ? styles.userText
                      : styles.assistantText,
                  ]}
                >
                  {msg.content}
                </Text>
                <Text style={[
                  styles.messageTime,
                  msg.role === 'user' && styles.userTimeText
                ]}>
                  {msg.timestamp.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  voiceEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  voiceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  stopSpeakingButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopSpeakingEmoji: {
    fontSize: 24,
  },
  stopSpeakingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  showConversationButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  showConversationText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  testButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FF9800',
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  testButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  conversationPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    paddingBottom: 20,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 30,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assistantText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
});
