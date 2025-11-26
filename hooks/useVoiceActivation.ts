/**
 * Hook para activación por voz ("Hey Julie")
 * Escucha en background esperando la palabra de activación
 */

import Voice from '@react-native-voice/voice';
import { useEffect, useRef, useState } from 'react';

interface VoiceActivationProps {
  enabled: boolean;
  phrases: string[];
  onActivated: () => void;
}

export function useVoiceActivation({
  enabled,
  phrases,
  onActivated,
}: VoiceActivationProps) {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const activationTimer = useRef<any>(null);

  useEffect(() => {
    if (!Voice) {
      console.warn('⚠️ Voice no disponible');
      return;
    }

    let isActive = true;

    // Configurar eventos de forma segura
    const setupVoiceListeners = () => {
      try {
        if (!Voice || !isActive) return;

        Voice.onSpeechStart = () => {
          if (!isActive) return;
          console.log('🎤 Escuchando activación...');
        };

        Voice.onSpeechEnd = () => {
          if (!isActive) return;
          console.log('🔇 Fin de voz');
          // Auto-reiniciar escucha
          if (enabled) {
            setTimeout(() => {
              if (isActive) startListening();
            }, 500);
          }
        };

        Voice.onSpeechResults = (event: any) => {
          if (!isActive) return;
          const results = event.value || [];
          const text = results[0]?.toLowerCase() || '';
          setLastHeard(text);

          console.log('💬 Detectado:', text);

          // Verificar si contiene frase de activación
          const activated = phrases.some(phrase => 
            text.includes(phrase.toLowerCase())
          );

          if (activated) {
            console.log('✅ ¡Activación detectada!');
            stopListening();
            onActivated();
          }
        };

        Voice.onSpeechError = (error: any) => {
          if (!isActive) return;
          console.log('⚠️ Error de voz:', error);
          if (enabled) {
            setTimeout(() => {
              if (isActive) startListening();
            }, 1000);
          }
        };
      } catch (err) {
        console.log('⚠️ Error configurando listeners:', err);
      }
    };

    setupVoiceListeners();

    return () => {
      isActive = false;
      if (Voice) {
        try {
          Voice.destroy()
            .then(() => {
              try {
                Voice.removeAllListeners();
              } catch (e) {
                // Listeners ya removidos
              }
            })
            .catch(err => {
              console.log('⚠️ Voice cleanup:', err.message);
            });
        } catch (err) {
          console.log('⚠️ Voice cleanup error:', err);
        }
      }
    };
  }, [phrases, onActivated, enabled]);

  const startListening = async () => {
    if (!Voice) return;
    
    try {
      // Detener cualquier escucha anterior primero
      try {
        await Voice.stop();
      } catch (e) {
        // Ya estaba detenido, continuar
      }
      
      console.log('👂 Iniciando escucha...');
      await Voice.start('es-CL');
      setIsListening(true);
    } catch (error: any) {
      console.error('❌ Error al iniciar:', error?.message || error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (!Voice) return;
    
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error: any) {
      console.error('❌ Error al detener:', error?.message || error);
      setIsListening(false);
    }
  };

  // Auto-start si está habilitado (con verificación de disponibilidad)
  useEffect(() => {
    if (!Voice) {
      console.warn('⚠️ Voice no disponible para auto-start');
      return;
    }

    // Verificar que Voice tenga el método start (inicializado correctamente)
    if (!Voice.start || typeof Voice.start !== 'function') {
      console.warn('⚠️ Voice.start no está disponible');
      return;
    }

    if (enabled) {
      // Delay para asegurar que Voice esté completamente inicializado
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      stopListening();
    }
  }, [enabled]);

  return {
    isListening,
    lastHeard,
  };
}
