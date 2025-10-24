/**
 * Utilidad para probar el Text-to-Speech
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export async function testTTS() {
  try {
    console.log('🧪 === TEST TTS INICIADO ===');
    
    // 1. Verificar permisos
    console.log('🔐 Verificando permisos...');
    const { status } = await Audio.getPermissionsAsync();
    console.log('📋 Estado de permisos:', status);
    
    // 2. Configurar modo de audio
    console.log('🔊 Configurando modo de audio...');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
    console.log('✅ Modo de audio configurado');
    
    // 3. Verificar voces disponibles
    console.log('🎙️ Verificando voces disponibles...');
    const voices = await Speech.getAvailableVoicesAsync();
    console.log('📋 Voces disponibles:', voices.length);
    
    
    // 4. Verificar si está hablando
    const isSpeaking = await Speech.isSpeakingAsync();
    console.log('📢 ¿Está hablando actualmente?', isSpeaking);
    
    // 5. Detener cualquier speech previo
    console.log('⏹️ Deteniendo speech previo...');
    await Speech.stop();
    
    // 6. Probar TTS
    console.log('🔊 Iniciando TTS de prueba...');
    
    return new Promise<boolean>((resolve) => {
      Speech.speak('Hola, soy Julie. Esta es una prueba de audio.', {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.85,
        volume: 1.0,
        onStart: () => {
          console.log('▶️ TTS iniciado');
        },
        onDone: () => {
          console.log('✅ TTS completado con éxito');
          console.log('🧪 === TEST TTS FINALIZADO EXITOSAMENTE ===');
          resolve(true);
        },
        onError: (error) => {
          console.error('❌ Error en TTS:', error);
          console.log('🧪 === TEST TTS FINALIZADO CON ERROR ===');
          resolve(false);
        },
        onStopped: () => {
          console.log('⏹️ TTS detenido manualmente');
          resolve(false);
        },
      });
    });
  } catch (error) {
    console.error('💥 Error fatal en test TTS:', error);
    console.log('🧪 === TEST TTS FINALIZADO CON ERROR FATAL ===');
    return false;
  }
}

/**
 * Test simple sin configuración de audio
 */
export function testTTSSimple() {
  console.log('🧪 Test TTS simple');
  Speech.speak('Prueba de audio simple', {
    language: 'es-ES',
    onDone: () => console.log('✅ Completado'),
    onError: (e) => console.error('❌ Error:', e),
  });
}

/**
 * Obtener información del sistema de audio
 */
export async function getAudioInfo() {
  try {
    console.log('📊 === INFORMACIÓN DEL SISTEMA DE AUDIO ===');
    
    // Permisos
    const permissions = await Audio.getPermissionsAsync();
    console.log('🔐 Permisos:', permissions);
    
    // Voces
    const voices = await Speech.getAvailableVoicesAsync();
    console.log('🎙️ Total de voces:', voices.length);
    
    const spanishVoices = voices.filter(v => v.language.startsWith('es'));
    console.log('🇪🇸 Voces en español:', spanishVoices.length);
    spanishVoices.forEach(v => {
      console.log(`   - ${v.name} (${v.language})`);
    });
    
    // Estado actual
    const isSpeaking = await Speech.isSpeakingAsync();
    console.log('📢 Hablando actualmente:', isSpeaking);
    
    console.log('📊 === FIN DE INFORMACIÓN ===');
    
    return {
      permissions,
      totalVoices: voices.length,
      spanishVoices: spanishVoices.length,
      isSpeaking,
    };
  } catch (error) {
    console.error('Error obteniendo información de audio:', error);
    return null;
  }
}
