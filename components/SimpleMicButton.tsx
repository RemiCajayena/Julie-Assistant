/**
 * SimpleMicButton - Botón de micrófono simple para adultos mayores
 * Solo graba, procesa y devuelve la respuesta sin modal ni chat
 */

import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConversationalEngine } from '../utils/conversationalEngine';

interface SimpleMicButtonProps {
  onResponse: (userText: string, aiResponse: string) => void;
  onError?: (error: string) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  size?: 'normal' | 'large';
  userId?: string; // ID del usuario para solicitudes de medicamentos
}

export interface SimpleMicButtonRef {
  stopAudio: () => Promise<void>;
}

export const SimpleMicButton = forwardRef<SimpleMicButtonRef, SimpleMicButtonProps>(({ 
  onResponse, 
  onError,
  onSpeakingChange,
  size = 'large',
  userId = 'usuario123' // Default para compatibilidad
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [conversationalEngine] = useState(() => new ConversationalEngine());
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  // Animación de pulso
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    
    if (isRecording) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [isRecording]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
      stopAudio();
    };
  }, []);

  // Función para detener audio en reproducción
  const stopAudio = async () => {
    try {
      console.log('⏹️ Deteniendo audio...');
      // Detener sonido de Google Cloud TTS si está reproduciéndose
      if (currentSoundRef.current) {
        console.log('⏹️ Deteniendo audio de Google Cloud TTS');
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
      }
      // Detener Speech.speak por si acaso (fallback)
      Speech.stop();
      onSpeakingChange?.(false);
      console.log('✅ Audio detenido');
    } catch (error) {
      console.error('❌ Error deteniendo audio:', error);
    }
  };

  // Exponer stopAudio al componente padre a través de ref
  useImperativeHandle(ref, () => ({
    stopAudio
  }));

  const startRecording = async () => {
    try {
      console.log('🎤 Solicitando permisos de audio...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        onError?.('Se requieren permisos de micrófono');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('🎤 Iniciando grabación...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      console.log('✅ Grabación iniciada');
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      onError?.('No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('🛑 Deteniendo grabación...');
      setIsRecording(false);
      setIsProcessing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        console.log('📁 Audio guardado en:', uri);
        await processAudio(uri);
      }
    } catch (error) {
      console.error('❌ Error al detener grabación:', error);
      setIsProcessing(false);
      onError?.('Error al procesar el audio');
    }
  };

  const processAudio = async (audioUri: string) => {
    try {
      // 1. Transcribir audio
      console.log('🔄 Transcribiendo audio...');
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);

      const transcribeResponse = await fetch('http://192.168.1.207:3000/transcribe', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!transcribeResponse.ok) {
        throw new Error('Error en la transcripción');
      }

      const transcribeData = await transcribeResponse.json();
      const userText = transcribeData.text;
      console.log('📝 Transcripción:', userText);

      if (!userText || userText.trim().length === 0) {
        onError?.('No se detectó ningún mensaje');
        setIsProcessing(false);
        return;
      }

      // 2. Obtener respuesta de Julie usando ConversationalEngine
      console.log('🤔 Consultando a Julie...');
      console.log(`📚 Historial actual: ${conversationHistory.length} mensajes`);
      
      // Agregar mensaje del usuario al historial
      const userMessage = { role: 'user', content: userText };
      const updatedHistory = [...conversationHistory, userMessage];
      
      console.log('🔍 DEBUG - Historial completo que se enviará:');
      updatedHistory.forEach((msg, idx) => {
        console.log(`   [${idx}] ${msg.role}: "${msg.content.substring(0, 50)}..."`);
      });
      
      // Función para manejar acciones de medicamentos
      const handleMedicationAction = async (action: any) => {
        if (action.action === 'query') {
          try {
            console.log(`💊 Consultando medicamentos del usuario: ${userId}...`);
            const medicationsResponse = await fetch(`http://192.168.1.207:3000/medications/${userId}`);
            
            if (medicationsResponse.ok) {
              const data = await medicationsResponse.json();
              const medications = data.medications || [];
              
              if (medications.length === 0) {
                return 'No tienes medicamentos registrados actualmente.';
              }
              
              // Si hay muchos medicamentos, mostrar solo los primeros 5
              const displayMeds = medications.slice(0, 5);
              const hasMore = medications.length > 5;
              
              // Formatear la lista de medicamentos de forma más legible
              const medList = displayMeds.map((med: any, index: number) => 
                `${index + 1}. ${med.name}${med.dosage ? ', ' + med.dosage : ''}${med.schedule ? ', a las ' + med.schedule : ''}`
              ).join('; ');
              
              let response = `Tienes ${medications.length} medicamento${medications.length > 1 ? 's' : ''} registrado${medications.length > 1 ? 's' : ''}. `;
              
              if (hasMore) {
                response += `Te menciono los primeros 5: ${medList}. Y ${medications.length - 5} más.`;
              } else {
                response += `Son: ${medList}.`;
              }
              
              return response;
            }
          } catch (error) {
            console.error('❌ Error consultando medicamentos:', error);
          }
        }
        return undefined;
      };
      
      const aiResponse = await conversationalEngine.generateResponse(
        userText,
        updatedHistory,
        { userName: undefined, preferences: [] },
        handleMedicationAction,
        userId // Pasar userId para solicitudes de medicamentos
      );
      
      // Agregar respuesta de Julie al historial
      const assistantMessage = { role: 'assistant', content: aiResponse };
      const finalHistory = [...updatedHistory, assistantMessage];
      setConversationHistory(finalHistory);
      console.log('💬 Respuesta de Julie:', aiResponse);
      console.log(`📚 Historial FINAL guardado: ${finalHistory.length} mensajes`);
      console.log('🔍 DEBUG - Últimos 3 mensajes guardados:');
      finalHistory.slice(-3).forEach((msg, idx) => {
        console.log(`   [${finalHistory.length - 3 + idx}] ${msg.role}: "${msg.content.substring(0, 50)}..."`);
      });

      // 3. Obtener y reproducir respuesta con Google Cloud TTS
      try {
        console.log('🔊 Solicitando audio a Google Cloud TTS...');
        onSpeakingChange?.(true); // Notificar que va a empezar a hablar
        
        const ttsResponse = await fetch('http://192.168.1.207:3000/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: aiResponse,
            voice: 'es-US-Neural2-A' // Voz femenina natural en español
          }),
        });

        if (ttsResponse.ok) {
          console.log('✅ Audio recibido del servidor');
          // Guardar audio temporalmente
          const audioBlob = await ttsResponse.blob();
          const reader = new FileReader();
          
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string;
              
              // Crear y reproducir sonido
              const { sound } = await Audio.Sound.createAsync(
                { uri: base64Audio },
                { shouldPlay: true }
              );
              
              // Guardar referencia al sonido actual
              currentSoundRef.current = sound;
              
              console.log('🎵 Reproduciendo audio de Google Cloud TTS');
              
              // Limpiar cuando termine
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                  console.log('✅ Audio terminado');
                  sound.unloadAsync();
                  currentSoundRef.current = null;
                  onSpeakingChange?.(false); // Notificar que terminó de hablar
                }
              });
            } catch (playError) {
              console.warn('⚠️ Error reproduciendo audio:', playError);
              // Fallback
              Speech.speak(aiResponse, {
                language: 'es-ES',
                pitch: 1.1,
                rate: 0.9,
                onDone: () => onSpeakingChange?.(false),
              });
            }
          };
          
          reader.readAsDataURL(audioBlob);
        } else {
          console.warn('⚠️ Error con TTS del servidor, usando Speech local');
          Speech.speak(aiResponse, {
            language: 'es-ES',
            pitch: 1.1,
            rate: 0.9,
            onDone: () => onSpeakingChange?.(false),
          });
        }
      } catch (ttsError) {
        console.warn('⚠️ Error con TTS:', ttsError);
        // Fallback a Speech local
        Speech.speak(aiResponse, {
          language: 'es-ES',
          pitch: 1.1,
          rate: 0.9,
          onDone: () => onSpeakingChange?.(false),
        });
      }

      // 4. Notificar respuesta
      onResponse(userText, aiResponse);
      setIsProcessing(false);

    } catch (error) {
      console.error('❌ Error procesando audio:', error);
      setIsProcessing(false);
      onError?.('Error al procesar tu mensaje');
    }
  };

  const buttonSize = size === 'large' ? 120 : 80;
  const iconSize = size === 'large' ? 60 : 40;

  return (
    <View style={styles.container}>
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.processingText}>Procesando...</Text>
        </View>
      )}
      
      {!isProcessing && (
        <TouchableOpacity
          style={[
            styles.micButton,
            { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
            isRecording && styles.micButtonRecording,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.micButtonInner,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={iconSize}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
      )}

      <Text style={[styles.instruction, size === 'large' && styles.instructionLarge]}>
        {isRecording ? 'Presiona para detener' : 'Presiona para hablar'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  micButtonRecording: {
    backgroundColor: '#F44336',
  },
  micButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  instructionLarge: {
    fontSize: 20,
    marginTop: 24,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    marginTop: 12,
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
});
